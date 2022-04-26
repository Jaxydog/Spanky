import { REST } from "@discordjs/rest"
import {
	DiscordGatewayAdapterCreator,
	entersState,
	getVoiceConnection,
	joinVoiceChannel,
	VoiceConnectionStatus,
} from "@discordjs/voice"
import Logger from "@jaxydog/clogts"
import { Routes } from "discord-api-types/v9"
import { ApplicationCommandDataResolvable, CommandInteraction, Message, MessageEmbed } from "discord.js"

export function stringContains(source: string, target: string | RegExp, ignoreSpaces = true) {
	let str = source.toLowerCase()
	if (ignoreSpaces) str = str.replaceAll(/\s/g, "")
	if (target instanceof RegExp) return target.test(str)
	else return str.includes(target)
}
export function messageContains(message: Message, target: string | RegExp, ignoreSpaces = true) {
	return [
		stringContains(message.content, target, ignoreSpaces),
		message.attachments.some((v) =>
			[
				stringContains(v.name ?? "", target, ignoreSpaces),
				stringContains(v.description ?? "", target, ignoreSpaces),
				stringContains(v.url ?? "", target, ignoreSpaces),
				stringContains(v.proxyURL ?? "", target, ignoreSpaces),
			].some((r) => r)
		),
		message.embeds.some((v) =>
			[
				stringContains(v.title ?? "", target, ignoreSpaces),
				stringContains(v.description ?? "", target, ignoreSpaces),
				stringContains(v.author?.name ?? "", target, ignoreSpaces),
				stringContains(v.author?.url ?? "", target, ignoreSpaces),
				stringContains(v.author?.iconURL ?? "", target, ignoreSpaces),
				stringContains(v.author?.proxyIconURL ?? "", target, ignoreSpaces),
				stringContains(v.footer?.text ?? "", target, ignoreSpaces),
				stringContains(v.footer?.iconURL ?? "", target, ignoreSpaces),
				stringContains(v.footer?.proxyIconURL ?? "", target, ignoreSpaces),
				stringContains(v.url ?? "", target, ignoreSpaces),
				stringContains(v.hexColor ?? "", target, ignoreSpaces),
				stringContains(v.image?.url ?? "", target, ignoreSpaces),
				stringContains(v.image?.proxyURL ?? "", target, ignoreSpaces),
				stringContains(v.thumbnail?.url ?? "", target, ignoreSpaces),
				stringContains(v.thumbnail?.proxyURL ?? "", target, ignoreSpaces),
				stringContains(v.video?.url ?? "", target, ignoreSpaces),
				stringContains(v.video?.proxyURL ?? "", target, ignoreSpaces),
				v.fields.some((v) =>
					[stringContains(v.name, target, ignoreSpaces), stringContains(v.value, target, ignoreSpaces)].some(
						(r) => r
					)
				),
			].some((r) => r)
		),
		message.mentions.users.some((v) =>
			[
				stringContains(v.tag, target, ignoreSpaces),
				stringContains(v.avatar ?? "", target, ignoreSpaces),
				stringContains(v.banner ?? "", target, ignoreSpaces),
			].some((r) => r)
		),
		message.mentions.roles.some((v) =>
			[
				stringContains(v.name, target, ignoreSpaces),
				stringContains(v.iconURL() ?? "", target, ignoreSpaces),
				stringContains(v.hexColor, target, ignoreSpaces),
			].some((r) => r)
		),
	].some((r) => r)
}
export function randomWeighted<T>(list: [number, T][]): T {
	const weightList = list.map((i) => i[0])
	const itemList = list.map((i) => i[1])
	const weights: number[] = []

	for (let index = 0; index < weightList.length; index++) {
		weights[index] = weightList[index]! + (weights[index - 1] ?? 0)
	}

	const randomValue = Math.random() * weights[weights.length - 1]!

	for (let index = 0; index < itemList.length; index++) {
		if (weights[index]! < randomValue) continue
		return itemList[index]!
	}

	return itemList[0]!
}
export async function refreshCommands(
	logger: Logger,
	body: ApplicationCommandDataResolvable[],
	clientId: string,
	guildId?: string
) {
	const rest = new REST({ version: "9" }).setToken(process.env["TOKEN"]!)
	const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId)

	try {
		await rest.put(route, { body })
		logger.info(`🔃 Refreshed application commands! 🔃`)
	} catch (error) {
		logger.error(error)
	}
}
export async function createVoiceConnection(
	logger: Logger,
	guildId: string,
	channelId: string,
	adapterCreator: DiscordGatewayAdapterCreator
) {
	try {
		const connection = joinVoiceChannel({ adapterCreator, channelId, guildId })
		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Connecting, 5000),
					entersState(connection, VoiceConnectionStatus.Signalling, 5000),
				])
			} catch (error) {
				connection.destroy()
			}
		})
		return true
	} catch (error) {
		logger.error(error)
		return false
	}
}
export async function terminateVoiceConnection(logger: Logger, guildId: string) {
	const connection = getVoiceConnection(guildId)

	try {
		connection?.destroy()
		logger.info(`🏃‍♂️ Left voice channel! 🏃‍♂️`)
		return true
	} catch (error) {
		logger.error(error)
		return false
	}
}
export async function handleCommand(logger: Logger, interaction: CommandInteraction) {
	switch (interaction.commandName) {
		case "join": {
			const member = await interaction.guild!.members.fetch(interaction.user.id)
			const channel = member.voice.channel

			if (!channel?.isVoice()) {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xff8888).setTitle("You must be in a voice channel!")],
				})
			}
			if (!channel.joinable) {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xff8888).setTitle("Unable to join channel!")],
				})
			}
			if (
				await createVoiceConnection(
					logger,
					interaction.guild!.id,
					channel.id,
					channel.guild.voiceAdapterCreator
				)
			) {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xffff88).setTitle("Monkey has entered the building!")],
				})
			} else {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xff8888).setTitle("An error has occurred!")],
				})
			}
		}
		case "leave": {
			if (await terminateVoiceConnection(logger, interaction.guildId!)) {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xffff88).setTitle("Monkey has returned to hiding...")],
				})
			} else {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xff8888).setTitle("An error has occurred!")],
				})
			}
		}
		case "speak": {
			if (interaction.user.id !== process.env["ADMIN"]) {
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xff8888).setTitle("Invalid permissions!")],
					ephemeral: true,
				})
			} else {
				await interaction.channel!.send({ content: interaction.options.getString("message") })
				return await interaction.reply({
					embeds: [new MessageEmbed().setColor(0xffff88).setTitle("The monkey has spoken!!!")],
					ephemeral: true,
				})
			}
		}
	}
}
