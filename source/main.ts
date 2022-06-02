import {
	DiscordGatewayAdapterCreator,
	entersState,
	getVoiceConnection,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from "@discordjs/voice"
import { Client, EmbedBuilder } from "@jaxydog/dibbs"
import { Message } from "discord.js"
import { config } from "dotenv"

config()

interface WeightedListData {
	triggers: string[]
	responses: [number, string][]
}

const client = new Client({
	commandGuildId: process.env["DEV_GUILD"]!,
	intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES"],
	token: process.env["TOKEN"]!,
	updateGlobalCommands: true,
})

client.commands
	.define("join", {
		name: "join",
		description: "Joins a voice channel",
		default_permission: false,
	})
	.create("join", async ({ interact }) => {
		if (!interact.guild) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Must be in guild!").build()],
				ephemeral: true,
			})
			return
		}

		const member = await interact.guild.members.fetch(interact.user.id)

		if (!member.voice.channel || !member.voice.channel.isVoice()) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("You must be in a valid voice channel!").build()],
				ephemeral: true,
			})
			return
		}
		if (!member.voice.channel.joinable) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Unable to join voice channel!").build()],
				ephemeral: true,
			})
			return
		}

		try {
			const connect = joinVoiceChannel({
				adapterCreator: member.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
				channelId: member.voice.channel.id,
				guildId: member.voice.channel.guild.id,
			})

			connect.on(VoiceConnectionStatus.Disconnected, async () => {
				try {
					await Promise.race([
						entersState(connect, VoiceConnectionStatus.Connecting, 5000),
						entersState(connect, VoiceConnectionStatus.Signalling, 5000),
					])
				} catch {
					connect.destroy()
				}
			})

			await interact.reply({
				embeds: [new EmbedBuilder().color("YELLOW").title("Monkey is in the building!").build()],
				ephemeral: true,
			})
		} catch (error) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Error joining channel!").build()],
				ephemeral: true,
			})
		}
	})
client.commands
	.define("leave", {
		name: "leave",
		description: "Leaves the current voice channel",
		default_permission: false,
	})
	.create("leave", async ({ interact }) => {
		if (!interact.guild) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Must be in guild!").build()],
				ephemeral: true,
			})
			return
		}

		const connect = getVoiceConnection(interact.guild.id)

		if (!connect) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("No voice connection found!").build()],
				ephemeral: true,
			})
			return
		}

		try {
			connect.destroy()

			await interact.reply({
				embeds: [new EmbedBuilder().color("YELLOW").title("Monkey has left the building!").build()],
				ephemeral: true,
			})
		} catch (error) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Error leaving channel!").build()],
				ephemeral: true,
			})
		}
	})
client.commands
	.define("speak", {
		name: "speak",
		description: "Sends a message",
		options: [
			{
				name: "message",
				description: "Message content",
				type: 3,
				required: true,
			},
		],
		default_permission: false,
	})
	.create("speak", async ({ interact }) => {
		const content = interact.options.getString("message", true)

		if (!interact.channel) {
			await interact.reply({ content })
		} else {
			await interact.channel.send({ content })
			await interact.reply({
				embeds: [new EmbedBuilder().color("YELLOW").title("The monkey has spoken!").build()],
				ephemeral: true,
			})
		}
	})
client.commands
	.define("react", {
		name: "react",
		description: "Reacts to the last message",
		options: [
			{
				name: "emoji",
				description: "Reaction emoji",
				type: 3,
				required: true,
			},
		],
		default_permission: false,
	})
	.create("react", async ({ interact }) => {
		const emoji = interact.options.getString("emoji", true)

		if (!interact.channel) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("Invalid channel!").build()],
				ephemeral: true,
			})
			return
		}

		const message = (await interact.channel.messages.fetch()).at(0)

		if (!message) {
			await interact.reply({
				embeds: [new EmbedBuilder().color("RED").title("No prior message found!").build()],
				ephemeral: true,
			})
			return
		}

		try {
			await message.react(emoji)

			await interact.reply({
				embeds: [new EmbedBuilder().color("YELLOW").title("Live monkey reaction 🙉").build()],
				ephemeral: true,
			})
		} catch (error) {
			await interact.reply({
				embeds: [
					new EmbedBuilder()
						.color("RED")
						.title("Error reacting!")
						.description("Most likely an invalid emoji...")
						.build(),
				],
				ephemeral: true,
			})
		}
	})

client.onEvent("messageCreate", async (message) => {
	if (message.author.bot) return

	const react = (await client.storage.get<WeightedListData>("react"))!
	const reply = (await client.storage.get<WeightedListData>("reply"))!

	const reactTerm = findContained(react.triggers, message, true)
	const replyTerm = findContained(reply.triggers, message, true)

	if (!!reactTerm) {
		const emoji = randomWeighted(react.responses)

		try {
			await message.react(emoji)
			client.logger.info(`Reacted to message containing '${reactTerm}' with '${emoji}'`)
		} catch (error) {
			client.logger.error(`Error reacting to message\n\t${error}`)
		}
	}
	if (!!replyTerm) {
		const content = randomWeighted(reply.responses)

		try {
			await message.reply({ content })
			client.logger.info(`Replied to message containt '${replyTerm}' with '${content}'`)
		} catch (error) {
			client.logger.error(`Error replying to message\n\t${error}`)
		}
	}
})

client.setStatus("idle")
client.setActivity({ type: "WATCHING", name: "for apes 👀" })
client.timer.invoke()

client.connect()

function findContained(list: string[], message: Message, ignoreSpaces = true) {
	for (const term of list) {
		if (!messageContains(message, term, ignoreSpaces)) continue
		return term
	}
}
function stringContains(source: string, target: string | RegExp, ignoreSpaces = true) {
	let str = source.toLowerCase()
	if (ignoreSpaces) str = str.replaceAll(/\s/g, "")
	if (target instanceof RegExp) return target.test(str)
	else return str.includes(target)
}
function messageContains(message: Message, target: string | RegExp, ignoreSpaces = true) {
	return [
		stringContains(message.content, target, ignoreSpaces),
		message.attachments.some((v) =>
			[
				stringContains(v.name ?? "", target, ignoreSpaces),
				stringContains(v.description ?? "", target, ignoreSpaces),
				stringContains(v.url ?? "", target, ignoreSpaces),
				stringContains(v.proxyURL ?? "", target, ignoreSpaces),
			].some((r) => r)
		),
		message.embeds.some((v) =>
			[
				stringContains(v.title ?? "", target, ignoreSpaces),
				stringContains(v.description ?? "", target, ignoreSpaces),
				stringContains(v.author?.name ?? "", target, ignoreSpaces),
				stringContains(v.author?.url ?? "", target, ignoreSpaces),
				stringContains(v.author?.iconURL ?? "", target, ignoreSpaces),
				stringContains(v.author?.proxyIconURL ?? "", target, ignoreSpaces),
				stringContains(v.footer?.text ?? "", target, ignoreSpaces),
				stringContains(v.footer?.iconURL ?? "", target, ignoreSpaces),
				stringContains(v.footer?.proxyIconURL ?? "", target, ignoreSpaces),
				stringContains(v.url ?? "", target, ignoreSpaces),
				stringContains(v.hexColor ?? "", target, ignoreSpaces),
				stringContains(v.image?.url ?? "", target, ignoreSpaces),
				stringContains(v.image?.proxyURL ?? "", target, ignoreSpaces),
				stringContains(v.thumbnail?.url ?? "", target, ignoreSpaces),
				stringContains(v.thumbnail?.proxyURL ?? "", target, ignoreSpaces),
				stringContains(v.video?.url ?? "", target, ignoreSpaces),
				stringContains(v.video?.proxyURL ?? "", target, ignoreSpaces),
				v.fields.some((v) =>
					[stringContains(v.name, target, ignoreSpaces), stringContains(v.value, target, ignoreSpaces)].some(
						(r) => r
					)
				),
			].some((r) => r)
		),
		message.mentions.users.some((v) =>
			[
				stringContains(v.tag, target, ignoreSpaces),
				stringContains(v.avatar ?? "", target, ignoreSpaces),
				stringContains(v.banner ?? "", target, ignoreSpaces),
			].some((r) => r)
		),
		message.mentions.roles.some((v) =>
			[
				stringContains(v.name, target, ignoreSpaces),
				stringContains(v.iconURL() ?? "", target, ignoreSpaces),
				stringContains(v.hexColor, target, ignoreSpaces),
			].some((r) => r)
		),
	].some((r) => r)
}
function randomWeighted<T>(list: [number, T][]): T {
	const weightList = list.map((i) => i[0])
	const itemList = list.map((i) => i[1])
	const weights: number[] = []

	for (let index = 0; index < weightList.length; index++) {
		weights[index] = weightList[index]! + (weights[index - 1] ?? 0)
	}

	const randomValue = Math.random() * weights[weights.length - 1]!

	for (let index = 0; index < itemList.length; index++) {
		if (weights[index]! < randomValue) continue
		return itemList[index]!
	}

	return itemList[0]!
}
