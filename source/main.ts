import Logger, { Level, Rule } from "@jaxydog/clogts"
import { BitFieldResolvable, Client, IntentsString, PresenceData } from "discord.js"
import { config } from "dotenv"

config()

import { dev, intents, presence } from "../data/config.json"
import Commands from "../data/command.json"
import Reactions from "../data/reaction.json"
import Replies from "../data/reply.json"
import { handleCommand, messageContains, randomWeighted, refreshCommands } from "./utils.js"
import dayjs from "dayjs"

const client = new Client({ intents: intents as BitFieldResolvable<IntentsString, number> })
const logger = new Logger()

logger.colors.create("primary", "#ffee66")
logger.colors.create("secondary", "#88ccff")
logger.colors.create("primary-bg", "#888888")
logger.colors.create("secondary-bg", "#666666")
logger.colors.create("info", "#88ccff")
logger.colors.create("warn", "#ffcc88")
logger.colors.create("error", "#ff8888")

logger.props.create(
	Level.All,
	() => dayjs().format("DD-MM-YY HH:mm:ss"),
	new Rule(/\d/g, "primary-bg"),
	new Rule(/[:-]/g, "secondary-bg")
)
logger.props.create(Level.Info, () => "<i>", new Rule(/[<>]/g, "primary-bg"), new Rule(/i/, "info"))
logger.props.create(Level.Warn, () => "<?>", new Rule(/[<>]/g, "primary-bg"), new Rule(/\?/, "warn"))
logger.props.create(Level.Error, () => "<!>", new Rule(/[<>]/g, "primary-bg"), new Rule(/!/, "error"))

client.on("ready", async () => {
	logger.props.create(Level.All, () => `(${client.user?.tag ?? "..."})`, new Rule(/./g, "primary"))

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
