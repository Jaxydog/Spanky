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
export function checkForWord(message: Message) {
	return Words.some((word) =>
		[
			message.content.toLowerCase().includes(word),
			message.attachments.some((v) =>
				[
					v.name?.toLowerCase().includes(word),
					v.description?.toLowerCase().includes(word),
					v.url?.toLowerCase().includes(word),
					v.proxyURL?.toLowerCase().includes(word),
				].some((_) => _)
			),
			message.embeds.some((v) =>
				[
					v.title?.toLowerCase().includes(word),
					v.description?.toLowerCase().includes(word),
					v.author?.name.toLowerCase().includes(word),
					v.author?.url?.toLowerCase().includes(word),
					v.author?.iconURL?.toLowerCase().includes(word),
					v.author?.proxyIconURL.toLowerCase().includes(word),
					v.footer?.text.toLowerCase().includes(word),
					v.footer?.iconURL.toLowerCase().includes(word),
					v.footer?.proxyIconURL.toLowerCase().includes(word),
				].some((_) => _)
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
