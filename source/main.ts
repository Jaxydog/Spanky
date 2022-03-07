import Discord from "discord.js"
import DotEnv from "dotenv"

import Config from "../data/config.json"
import Logger from "./class/logger"
import { react, refreshDevCommands, registerCommands, reply } from "./actions"
import Command from "./class/command"

DotEnv.config()

const logger = new Logger(Config.dev)
const client = new Discord.Client({ intents: ["GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILDS"] })

client.on("ready", () => {
	logger.log(`Connected to API as ${client.user.tag}`)

	if (Config.dev) {
		logger.log(`Developer mode enabled 😎`)
		refreshDevCommands(client.user.id, logger)
	}

	registerCommands(logger)

	client.user.presence.set({
		status: "idle",
		activities: [{ type: "WATCHING", name: "for apes 👀" }],
	})

	logger.log(`Updated client presence`)
})
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return
	logger.log(`Interaction recieved: "${interaction.commandName}"`)
	Command.handle(interaction, logger)
})
client.on("messageCreate", (message) => {
	react(message, logger)
	reply(message, logger)
})

client.login(process.env.TOKEN)
