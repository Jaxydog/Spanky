import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js"
import { bot } from "../main"

bot.action.commands
	.define("react", {
		name: "react",
		description: "Monkey see, monkey do",
		type: ApplicationCommandType.ChatInput,

		defaultMemberPermissions: "Administrator",
		dmPermission: false,

		options: [
			{
				name: "emojis",
				description: "Reaction emoji(s) (space separated)",
				type: ApplicationCommandOptionType.String,

				required: true,
			},
		],
	})
	.on("react", async (context) => {
		context.expect_owner()

		if (!context.interaction.isChatInputCommand()) return
		await context.interaction.deferReply({ ephemeral: true })

		const messages = await context.channel().messages.fetch()
		const message = messages.first()
		if (!message) throw "No valid message!"

		const emojis = context.interaction.options.getString("emojis", true).split(" ").slice(0, 20)

		for (const emoji of emojis) await message.react(emoji)
		await context.interaction.followUp("Live monkey reaction ^")
	})
