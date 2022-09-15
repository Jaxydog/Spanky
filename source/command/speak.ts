import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js"
import { bot } from "../main"

bot.action.commands
	.define("speak", {
		name: "speak",
		description: "Speak, monkey!",
		type: ApplicationCommandType.ChatInput,

		defaultMemberPermissions: "Administrator",
		dmPermission: false,

		options: [
			{
				name: "content",
				description: "What should monkey say?",
				type: ApplicationCommandOptionType.String,

				maxLength: 2000,
				required: true,
			},
			{
				name: "reply",
				description: "Whether to reply to the last message",
				type: ApplicationCommandOptionType.Boolean,

				required: false,
			},
		],
	})
	.on("speak", async (context) => {
		context.expect_owner()

		if (!context.interaction.isChatInputCommand()) return
		await context.interaction.deferReply({ ephemeral: true })

		const content = context.interaction.options.getString("content", true)
		const reply = context.interaction.options.getBoolean("reply", false) ?? false

		if (reply) {
			const messages = await context.channel().messages.fetch()
			const message = messages.first()

			if (!message) throw "No valid message!"

			await message.reply(content)
		} else {
			await context.channel().send(content)
		}

		await context.interaction.followUp("The monkey has spoken!")
	})
