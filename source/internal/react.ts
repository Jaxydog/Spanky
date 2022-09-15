import CSV from "csvtojson"
import { bot } from "../main"
import { random_weighted } from "../utility/random"
import { get_contained } from "../utility/search"

bot.storage.get<string>("react_trigger", { data_type: "txt" }).then(
	(string) => {
		const result = bot.env.set("react_trigger", (string ?? "").split("\n"))

		result ? bot.logger.info("Loaded reaction triggers") : bot.logger.error("Unable to store reaction triggers!")
	},
	(error) => bot.logger.error(`Unable to load reaction triggers!\n\t-> ${error}`)
)

CSV()
	.fromFile("data/react_response.csv")
	.then(
		(values: { weight: string; response: string }[]) => {
			const data = values.map((value) => [+value.weight, value.response])
			const result = bot.env.set("react_response", data as [number, string][])

			result
				? bot.logger.info("Loaded reaction responses")
				: bot.logger.error("Unable to store reaction responses!")
		},
		(error) => bot.logger.error(`Unable to load reaction responses!\n\t-> ${error}`)
	)

bot.client.on("messageCreate", async (message) => {
	if (message.author.bot) return
	if (message.author.system) return

	const triggers = bot.env.get<string[]>("react_trigger") ?? []
	const contained = get_contained(message, triggers, true, true)
	if (!contained) return

	try {
		const responses = bot.env.get<[number, string][]>("react_response")
		if (!responses || responses.length === 0) throw "Missing react responses!"

		const emoji = random_weighted(responses)
		if (!emoji) throw `Unknown error!\n\t-> ${responses}`

		await message.react(emoji)
		bot.logger.info(`Reacted to message: ${contained} -> ${emoji}`)
	} catch (error) {
		bot.logger.warn(`Error reacting to message!\n\t-> ${error}`)
	}
})
