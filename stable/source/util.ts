import { Message } from "discord.js"

export interface WeightedList<T, R> {
	triggers: T[]
	responses: [number, R][]
}

export module MathN {
	export function rand(min: number, max: number) {
		min = Math.ceil(min)
		max = Math.floor(max)
		return Math.floor(Math.random() * (max - min + 1) + min)
	}
	export function randDeviate(base: number, dev: number) {
		base = Math.abs(base)
		dev = Math.abs(dev)

		if (dev > base) dev = base

		const min = base - dev
		const max = base + dev
		return rand(min, max)
	}
	export function randWeight<R>(list: [number, R][]): R {
		const weightArr = list.map((i) => i[0])
		const valueArr = list.map((i) => i[1])
		const weights: number[] = []

		for (let i = 0; i < weightArr.length; i++) {
			weights[i] = weightArr[i]! + (weights[i - 1] ?? 0)
		}

		const random = Math.random() * weights[weights.length - 1]!
		return valueArr.find((_, i) => weights[i]! >= random) ?? valueArr[0]!
	}
}
export module MathB {
	export function rand(min: bigint, max: bigint) {
		return BigInt(MathN.rand(Number(min), Number(max)))
	}
	export function randDeviate(base: bigint, dev: bigint) {
		return BigInt(MathN.randDeviate(Number(base), Number(dev)))
	}
}

export function strContains(str: string, target: string | RegExp, ignoreSpaces = false, ignoreCase = true) {
	if (ignoreSpaces) str = str.replace(/\s/g, "")
	if (ignoreCase) str = str.toLowerCase()

	if (target instanceof RegExp) {
		return target.test(str)
	} else {
		return str.includes(target)
	}
}
export function msgContains(msg: Message, target: string | RegExp, ignoreSpaces = false, ignoreCase = true) {
	return [
		strContains(msg.content, target, ignoreSpaces, ignoreCase),
		msg.attachments.some((v) =>
			[
				strContains(v.name ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.description ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.url, target, ignoreSpaces, ignoreCase),
				strContains(v.proxyURL, target, ignoreSpaces, ignoreCase),
			].some((r) => r)
		),
		msg.embeds.some((v) =>
			[
				strContains(v.title ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.description ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.author?.name ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.author?.url ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.author?.iconURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.author?.proxyIconURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.footer?.text ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.footer?.iconURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.footer?.proxyIconURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.url ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.hexColor ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.image?.url ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.image?.proxyURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.thumbnail?.url ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.thumbnail?.proxyURL ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.video?.url ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.video?.proxyURL ?? "", target, ignoreSpaces, ignoreCase),
				v.fields.some((v) =>
					[
						strContains(v.name, target, ignoreSpaces, ignoreCase),
						strContains(v.value, target, ignoreSpaces, ignoreCase),
					].some((r) => r)
				),
			].some((r) => r)
		),
		msg.mentions.users.some((v) =>
			[
				strContains(v.tag, target, ignoreSpaces, ignoreCase),
				strContains(v.avatarURL() ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.bannerURL() ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.hexAccentColor ?? "", target, ignoreSpaces, ignoreCase),
			].some((r) => r)
		),
		msg.mentions.roles.some((v) =>
			[
				strContains(v.name, target, ignoreSpaces, ignoreCase),
				strContains(v.iconURL() ?? "", target, ignoreSpaces, ignoreCase),
				strContains(v.hexColor, target, ignoreSpaces, ignoreCase),
			].some((r) => r)
		),
	].some((r) => r)
}
export function getContained(val: string | Message, arr: (string | RegExp)[], ignoreSpaces = false, ignoreCase = true) {
	if (val instanceof Message) {
		return arr.find((t) => msgContains(val, t, ignoreSpaces, ignoreCase))
	} else {
		return arr.find((t) => strContains(val, t, ignoreSpaces, ignoreCase))
	}
}
