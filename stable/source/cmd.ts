import {
	DiscordGatewayAdapterCreator,
	entersState,
	getVoiceConnection,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from "@discordjs/voice"
import { EmbedBuilder } from "@jaxydog/dibbs"
import { Message } from "discord.js"
import { client } from "./main"
import { getContained, randWeight, WeightedList } from "./util"

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
				adapterCreator: member.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
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
	.define("react", {
		name: "react",
		description: "Reacts to the last message",
		options: [
			{
				name: "emoji",
				description: "Reaction emoji(s) (comma separated)",
				type: 3,
				required: true,
			},
		],
		default_permission: false,
	})
	.create("react", async ({ interact }) => {
		const emojis = interact.options.getString("emoji", true).split(",")

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
			for (const emoji of emojis) await message.react(emoji)

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

export async function tryReact(message: Message) {
	const { responses, triggers } = (await client.storage.get<WeightedList<string, string>>("react"))!
	const contained = getContained(message, triggers, true, true)

	if (!contained) return

	try {
		const response = randWeight(responses)
		await message.react(response)

		client.logger.info(`Reacted to message containing "${contained}" with "${response}"`)
	} catch (error) {
		client.logger.warn(`Error reacting to message\n\t${error}`)
	}
}
export async function tryReply(message: Message) {
	const { responses, triggers } = (await client.storage.get<WeightedList<string, string>>("reply"))!
	const contained = getContained(message, triggers, true, true)

	if (!contained) return

	try {
		const response = randWeight(responses)
		await message.reply({ content: response })

		client.logger.info(`Replied to message containing "${contained}" with "${response}"`)
	} catch (error) {
		client.logger.warn(`Error reacting to message\n\t${error}`)
	}
}
