import { WyvernClient } from "@jaxydog/wyverncore"
import { config } from "dotenv"
import { ActivityType } from "discord.js"

config()

export const bot = new WyvernClient({
	intents: [
		"DirectMessageReactions",
		"DirectMessages",
		"GuildEmojisAndStickers",
		"GuildMessageReactions",
		"GuildMessages",
		"Guilds",
		"MessageContent",
	],
	token: process.env["TOKEN"]!,
	color: "#eeee99",
	dev_guilds: [process.env["GUILD"]!],
	global_update: true,
	header: "Spanky v2",
	save_logs: true,
	silent: false,
	timer_interval: 30_000,
})

require("./internal/react")
require("./internal/reply")
require("./command/react")
require("./command/speak")

bot.timer.add(async (bot) => {
	bot.client.user?.setPresence({
		status: "idle",
		activities: [{ type: ActivityType.Watching, name: "for apes 🙉" }],
	})
})

bot.connect()
