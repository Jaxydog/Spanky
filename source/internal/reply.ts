import CSV from "csvtojson"
import { bot } from "../main"
import { random_weighted } from "../utility/random"
import { get_contained } from "../utility/search"

bot.storage.get<string>("reply_trigger", { data_type: "txt" }).then(
	(string) => {
		const result = bot.env.set("reply_trigger", (string ?? "").split("\n"))

		result ? bot.logger.info("Loaded reply triggers") : bot.logger.error("Unable to store reply triggers!")
	},
	(error) => bot.logger.error(`Unable to load reply triggers!\n\t-> ${error}`)
)

CSV()
	.fromFile("data/reply_response.csv")
	.then(
		(values: { weight: string; response: string; emoji: string }[]) => {
			const data = values.map((value) => [+value.weight, value.response, value.emoji])
			const result = bot.env.set("reply_response", data as [number, string, string?][])

			result ? bot.logger.info("Loaded reply responses") : bot.logger.error("Unable to store reply responses!")
		},
		(error) => bot.logger.error(`Unable to load reply responses!\n\t-> ${error}`)
	)

bot.client.on("messageCreate", async (message) => {
	if (message.author.bot) return
	if (message.author.system) return

	const triggers = bot.env.get<string[]>("reply_trigger") ?? []
	const contained = get_contained(message, triggers, false, true)
	if (!contained) return

	try {
		const responses = bot.env.get<[number, string, string?][]>("reply_response")
		if (!responses || responses.length === 0) throw "Missing reply responses!"

		const replies = responses.map(([w, t, e]) => [w, e !== "" ? `${e} ${t} ${e}` : t] as [number, string])
		const reply = random_weighted(replies)
		if (!reply) throw `Unknown error!\n\t-> ${replies}`

		await message.reply(reply)
		bot.logger.info(`Replied to message: ${contained} -> ${reply}`)
	} catch (error) {
		bot.logger.warn(`Error replying to message!\n\t-> ${error}`)
	}
})
