import { CacheType, CommandInteraction, GuildMember, Message, MessageEmbed } from "discord.js"
import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"

import { name, version, author } from "../package.json"
import Commands from "../data/commands.json"
import Words from "../data/words.json"
import Reactions from "../data/reactions.json"
import ReplyWords from "../data/replywords.json"
import ReplyMessages from "../data/replymessages.json"
import Logger from "./class/logger"
import Command from "./class/command"

type WeightedList = { item: string; weight: number }[]

function embed() {
	return new MessageEmbed({
		color: 0xffee88,
		footer: { text: `${name[0].toUpperCase() + name.slice(1).toLowerCase()} v${version} by ${author}` },
	})
}
async function tempReply(interaction: CommandInteraction<CacheType>, reply: string) {
	try {
		await interaction.reply(reply)
		await new Promise((r) => setTimeout(r, 5000))
		await interaction.deleteReply()
	} catch {}
}
async function tempReplyEmbed(interaction: CommandInteraction<CacheType>, reply: MessageEmbed) {
	try {
		await interaction.reply({ embeds: [reply] })
		await new Promise((r) => setTimeout(r, 5000))
		await interaction.deleteReply()
	} catch {}
}

export function registerCommands(logger?: Logger) {
	logger?.log(`Registering commands`)

	Command.fromEntry(Commands[0], async (interaction) => {
		if (!(interaction.member instanceof GuildMember)) {
			await tempReplyEmbed(
				interaction,
				embed().setTitle("Error occurred!").setDescription("An unknown error occurred.")
			)
			return false
		}

		const member = interaction.guild.members.resolve(interaction.member)
		const channel = member.voice.channel

		if (!channel || !channel.isVoice()) {
			await tempReplyEmbed(interaction, embed().setTitle("Error occurred!").setDescription("Invalid channel."))
			return false
		}
		if (!channel.joinable) {
			await tempReplyEmbed(
				interaction,
				embed().setTitle("Error occurred!").setDescription("Unable to join channel.")
			)
			return false
		}

		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: interaction.guildId,
			adapterCreator: channel.guild.voiceAdapterCreator,
		})

		if (!connection) {
			await tempReplyEmbed(interaction, embed().setTitle("Error occurred!").setDescription("Unable to connect."))
			return false
		}

		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5000),
				])
			} catch {
				connection.destroy()
			}
		})

		await tempReplyEmbed(
			interaction,
			embed().setTitle("Joined channel!").setDescription("Monkey is in the building...")
		)
		return true
	})
	Command.fromEntry(Commands[1], async (interaction) => {
		const connection = getVoiceConnection(interaction.guildId)

		if (connection.state.status === VoiceConnectionStatus.Ready) {
			try {
				connection.destroy()
			} catch (error) {
				logger.warn(error)
			}

			await tempReplyEmbed(
				interaction,
				embed().setTitle("Left channel!").setDescription("Monkey has gone back into hiding...")
			)
			return true
		} else {
			await tempReplyEmbed(
				interaction,
				embed().setTitle("Error occurred!").setDescription("Unknown error occurred.")
			)
			return false
		}
	})
}
export async function refreshDevCommands(clientID: string, logger?: Logger) {
	const rest = new REST({ version: "9" }).setToken(process.env.TOKEN)
	const route = Routes.applicationGuildCommands(clientID, process.env.DEVSERVER)

	try {
		await rest.put(route, { body: Commands })
		logger?.log(`Refreshed dev commands`)
	} catch (e) {
		logger?.warn(`Error refreshing dev commands`)
		logger?.warn(e)
	}
}
export async function refreshProdCommands(clientID: string, logger?: Logger) {
	const rest = new REST({ version: "9" }).setToken(process.env.TOKEN)
	const route = Routes.applicationCommands(clientID)

	try {
		await rest.put(route, { body: Commands })
		logger?.log(`Refreshed production commands`)
	} catch (e) {
		logger?.warn(`Error refreshing commands`)
		logger?.warn(e)
	}
}

function checkString(string: string, word: string, removeSpaces = true) {
	const str = (string ?? "").toLowerCase()
	return (removeSpaces ? str.replaceAll(/\s/g, "") : str).includes(word)
}
function thoroughCheck(message: Message, string: string, removeSpaces = true) {
	return [
		checkString(message.content, string, removeSpaces),
		message.attachments.some((v) =>
			[
				checkString(v.name, string, removeSpaces),
				checkString(v.description, string, removeSpaces),
				checkString(v.url, string, removeSpaces),
				checkString(v.proxyURL, string, removeSpaces),
			].some((_) => _)
		),
		message.embeds.some((v) =>
			[
				checkString(v.title, string, removeSpaces),
				checkString(v.description, string, removeSpaces),
				checkString(v.author?.name, string, removeSpaces),
				checkString(v.author?.url, string, removeSpaces),
				checkString(v.author?.iconURL, string, removeSpaces),
				checkString(v.author?.proxyIconURL, string, removeSpaces),
				checkString(v.footer?.text, string, removeSpaces),
				checkString(v.footer?.iconURL, string, removeSpaces),
				checkString(v.footer?.proxyIconURL, string, removeSpaces),
				v.fields.some((v) =>
					[checkString(v.name, string, removeSpaces), checkString(v.value, string, removeSpaces)].some(
						(_) => _
					)
				),
			].some((_) => _)
		),
		message.mentions.users.some((v) =>
			[
				checkString(v.username, string, removeSpaces),
				checkString(v.avatar, string, removeSpaces),
				checkString(v.banner, string, removeSpaces),
			].some((_) => _)
		),
		message.mentions.roles.some((v) =>
			[
				checkString(v.name, string, removeSpaces),
				checkString(v.icon, string, removeSpaces),
				checkString(v.hexColor, string, removeSpaces),
			].some((_) => _)
		),
	].some((_) => _)
}
function randomWeighted(list: WeightedList) {
	const weights: number[] = []
	list.forEach((r, i) => (weights[i] = r.weight + (weights[i - 1] ?? 0)))
	const maxWeight = weights[weights.length - 1]
	const random = Math.random() * maxWeight

	for (const item of list) {
		if (weights[list.indexOf(item)] >= random) return item.item
	}

	return ""
}

export function react(message: Message, logger?: Logger) {
	if (!Words.some((word) => thoroughCheck(message, word))) return

	const emoji = randomWeighted(Reactions)
	message.react(emoji)
	logger?.log(`Reacting to message! ${emoji}`)
}
export function reply(message: Message, logger?: Logger) {
	if (!ReplyWords.some((word) => thoroughCheck(message, word, false))) return

	const reply = randomWeighted(ReplyMessages)
	message.reply(reply)
	logger?.log(`Replying to message! ${reply}`)
}
