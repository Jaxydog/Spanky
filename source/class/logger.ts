import FS from "fs/promises"

export default class Logger {
	private static readonly __dateSeparator = "-"
	private static readonly __timeSeparator = " "
	private static readonly __rootFolder = "logs/"

	private readonly __path: string

	public constructor(dev?: boolean) {
		this.__path = Logger.__newPath(dev)
	}

	private static __newPath(dev?: boolean) {
		const now = new Date()
		const pad = (n: number) => `${n}`.padStart(2, "0")

		const date = [pad(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate())].join(Logger.__dateSeparator)
		const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(Logger.__timeSeparator)

		return `${Logger.__rootFolder}${date} ${time}${dev ? ".dev" : ""}.txt`
	}

	private async __write(text: string) {
		const tag = `[${`${Date.now()}`}]`
		const message = `${tag}\t${text}`
		console.log(message)
		await FS.mkdir(Logger.__rootFolder, { recursive: true })
		await FS.appendFile(this.__path, `${message}\n`, { encoding: "utf8" })
	}

	public log(...message: unknown[]) {
		this.__write(`${message}`)
	}
	public warn(...message: unknown[]) {
		this.__write(`${message}`)
	}
	public error(...message: unknown[]) {
		this.__write(`${message}`)
	}
}
