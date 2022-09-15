export type WeightedList<T> = [number, T][]

export function random_float(min: number, max: number) {
	return Math.random() * (max - min) + min
}
export function random_int(min: number, max: number) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min + 1) + min)
}
export function random_weighted<T>(list: WeightedList<T>) {
	const weight_arr = list.map((a) => a[0])
	const weights: number[] = []

	for (let index = 0; index < weight_arr.length; index++) {
		weights[index] = weight_arr[index]! + (weights[index - 1] ?? 0)
	}

	const random = Math.random() * weights[weights.length - 1]!
	const values = list.map((a) => a[1])

	return values.find((_, i) => weights[i]! >= random) ?? values[0]
}
