import { CacheType, CommandInteraction } from "discord.js"
import Commands from "../../data/commands.json"
import Logger from "./logger"

export type CommandCallback = (interaction: CommandInteraction<CacheType>) => boolean | Promise<boolean>

export default class Command {
	private static readonly __list: Map<string, Command> = new Map()

	private readonly __name: string
	private readonly __desc: string
	private readonly __args: string[]
	private readonly __callback: CommandCallback

	public constructor(name: string, desc: string, args: string[], callback: CommandCallback) {
		this.__name = name
		this.__desc = desc
		this.__args = args
		this.__callback = callback

		Command.__list.set(this.__name, this)
	}

	public get name() {
		return this.__name
	}
	public get description() {
		return this.__desc
	}
	public get options() {
		return this.__args
	}
	public get callback() {
		return this.__callback
	}

	public static fromEntry({ name, description, options }, callback: CommandCallback) {
		return new Command(name, description, options, callback)
	}
	public static handle(interaction: CommandInteraction<CacheType>, logger?: Logger) {
		if (!this.__list.has(interaction.commandName)) {
			logger?.error(`Missing command entry "${interaction.commandName}"`)
			return false
		}

		return this.__list.get(interaction.commandName).callback(interaction)
	}

	public toJSON() {
		return JSON.stringify(
			{
				name: this.__name,
				description: this.__desc,
				options: this.__args,
			},
			null,
			"\t"
		)
	}
}
