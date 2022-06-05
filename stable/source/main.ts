import { Client } from "@jaxydog/dibbs"
import { config } from "dotenv"

config()

export const client = new Client({
	commandGuildId: process.env["GUILD"]!,
	intents: [
		"DIRECT_MESSAGES",
		"DIRECT_MESSAGE_REACTIONS",
		"GUILDS",
		"GUILD_EMOJIS_AND_STICKERS",
		"GUILD_MEMBERS",
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILD_VOICE_STATES",
	],
	token: process.env["TOKEN"]!,
	storeLogs: true,
	updateGlobalCommands: true,
})

import { tryReact, tryReply } from "./cmd"

client.setStatus("idle")
client.setActivity({ type: "WATCHING", name: "for apes 👀" })

client.onEvent("messageCreate", async (message) => {
	if (message.author.bot) return

	await tryReact(message)
	await tryReply(message)
})

client.connect().then(() => {
	client.timer.invoke()
})
