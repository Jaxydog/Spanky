import Discord from "discord.js"
import DotEnv from "dotenv"

import Package from "../package.json"
import Config from "../data/config.json"
import Logger from "@jaxydog/clogts"
import { react, refreshDevCommands, refreshProdCommands, registerCommands, reply } from "./actions"
import Command from "./class/command"

DotEnv.config()

const logger = new Logger(Package.name)
const client = new Discord.Client({
	intents: ["GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILDS", "GUILD_VOICE_STATES"],
})

client.on("ready", () => {
	logger.info(`Connected to API as ${client.user.tag}`)

	if (Config.dev) {
		logger.info(`Developer mode enabled 😎`)
		refreshDevCommands(client.user.id, logger)
	} else {
		logger.info(`Production mode enabled 😎`)
		refreshProdCommands(client.user.id, logger)
	}

	registerCommands(logger)

	client.user.presence.set({
		status: "idle",
		activities: [{ type: "WATCHING", name: "for apes 👀" }],
	})

	logger.info(`Updated client presence`)
})
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return
	logger.info(`Interaction recieved: "${interaction.commandName}"`)
	Command.handle(interaction, logger)
})
client.on("messageCreate", (message) => {
	if (message.author.id === client.user.id) return
	react(message, logger)
	reply(message, logger)
})

client.login(process.env.TOKEN)
