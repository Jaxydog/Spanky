import { CacheType, CommandInteraction, Message, MessageEmbed } from "discord.js"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"

import { name, version, author } from "../package.json"
import Commands from "../data/commands.json"
import Words from "../data/words.json"
import Reactions from "../data/reactions.json"
import Logger from "./class/logger"
import Command from "./class/command"

function embed() {
	return new MessageEmbed({
		color: 0xffee88,
		footer: { text: `${name[0].toUpperCase() + name.slice(1).toLowerCase()} v${version} by ${author}` },
	})
}
async function tempReply(interaction: CommandInteraction<CacheType>, reply: string) {
	await interaction.reply(reply)
	await new Promise((r) => setTimeout(r, 5000))
	await interaction.deleteReply()
}
async function tempReplyEmbed(interaction: CommandInteraction<CacheType>, reply: MessageEmbed) {
	await interaction.reply({ embeds: [reply] })
	await new Promise((r) => setTimeout(r, 5000))
	await interaction.deleteReply()
}
export function registerCommands(logger?: Logger) {
	logger?.log(`Registering commands`)

	Command.fromEntry(Commands[0], async (interaction) => {
		await tempReplyEmbed(interaction, embed().setTitle("Pong!").setDescription("Monkey hears all 🙉"))
		return true
	})
	Command.fromEntry(Commands[1], async (interaction) => {
		await tempReply(interaction, `WIP`)
		return true
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
function checkString(string: string, word: string) {
	return (string ?? "").replaceAll(/\s/g, "").toLowerCase().includes(word)
}
export function checkForWord(message: Message) {
	return Words.some((word) =>
		[
			checkString(message.content, word),
			message.attachments.some((v) =>
				[
					checkString(v.name, word),
					checkString(v.description, word),
					checkString(v.url, word),
					checkString(v.proxyURL, word),
				].some((_) => _)
			),
			message.embeds.some((v) =>
				[
					checkString(v.title, word),
					checkString(v.description, word),
					checkString(v.author?.name, word),
					checkString(v.author?.url, word),
					checkString(v.author?.iconURL, word),
					checkString(v.author?.proxyIconURL, word),
					checkString(v.footer?.text, word),
					checkString(v.footer?.iconURL, word),
					checkString(v.footer?.proxyIconURL, word),
					v.fields.some((v) => [checkString(v.name, word), checkString(v.value, word)].some((_) => _)),
				].some((_) => _)
			),
			message.mentions.users.some((v) =>
				[checkString(v.username, word), checkString(v.avatar, word), checkString(v.banner, word)].some((_) => _)
			),
			message.mentions.roles.some((v) =>
				[checkString(v.name, word), checkString(v.icon, word), checkString(v.hexColor, word)].some((_) => _)
			),
		].some((_) => _)
	)
}
export function react(message: Message, logger?: Logger) {
	if (!checkForWord(message)) return

	const weights: number[] = []
	Reactions.forEach((r, i) => (weights[i] = r.weight + (weights[i - 1] ?? 0)))
	const maxWeight = weights[weights.length - 1]
	const random = Math.random() * maxWeight

	for (const item of Reactions) {
		if (weights[Reactions.indexOf(item)] < random) continue
		message.react(item.emoji)
		logger?.log(`Reacting to message! ${item.emoji}`)
		break
	}
}
