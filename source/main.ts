import Logger from "@jaxydog/clogts"
import { BitFieldResolvable, Client, IntentsString, PresenceData } from "discord.js"
import { config } from "dotenv"

config()

import { dev, intents, presence } from "../data/config.json"
import Commands from "../data/command.json"
import Reactions from "../data/reaction.json"
import Replies from "../data/reply.json"
import { handleCommand, messageContains, randomWeighted, refreshCommands } from "./utils.js"

const client = new Client({ intents: intents as BitFieldResolvable<IntentsString, number> })
let logger: Logger

client.on("ready", async () => {
	logger = new Logger(client.user?.tag ?? "bot")

	logger.info(`🤖 Logged in as user ${client.user?.tag ?? "[unknown]"} 🤖`)

	if (dev) {
		logger.info("🍌 Developer mode enabled! 🍌")
		await refreshCommands(logger, Commands, client.user!.id, process.env["DEVGUILDID"])
	} else {
		logger.info("🥑 Production mode enabled! 🥑")
		await refreshCommands(logger, Commands, client.user!.id)
	}

	client.user?.presence.set(presence as PresenceData)
})
client.on("presenceUpdate", (_, newPresence) => {
	if (newPresence.status === presence.status && newPresence.activities[0] === presence.activities[0]) return
	client.user?.presence.set(presence as PresenceData)
})
client.on("messageCreate", async (message) => {
	if (message.author.id === client.user?.id) return

	if (Reactions.triggers.some((t) => messageContains(message, t))) {
		const emoji = randomWeighted(Reactions.responses as [number, string][])

		try {
			await message.react(emoji)
			logger.info(`${emoji} Reacting to message! ${emoji}`)
		} catch (error) {
			logger.error(error)
		}
	}
	if (Replies.triggers.some((t) => messageContains(message, t, false))) {
		const reply = randomWeighted(Replies.responses as [number, string][])

		try {
			await message.reply(reply)
			logger.info(`💩 Replying to message! 💩 >> ${reply}`)
		} catch (error) {
			logger.error(error)
		}
	}
})
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return
	await handleCommand(logger, interaction)
})

client.login(process.env["TOKEN"])
