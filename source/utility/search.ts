export function str_contains(str: string, target: string | RegExp, rm_nontext = false, rm_case = true) {
	if (rm_nontext) str = str.replace(/\W/g, "")
	if (rm_case) str = str.toLowerCase()

	return target instanceof RegExp ? target.test(str) : str.includes(target)
}
export function object_contains_str(
	obj: object,
	target: string | RegExp,
	rm_nontext = false,
	rm_case = false,
	max_d = 5,
	d = 0
) {
	if (d >= max_d) return false

	for (const val of Object.values(obj)) {
		if (typeof val === "string") {
			if (str_contains(val, target, rm_nontext, rm_case)) return true
		} else if (typeof val === "object" && val !== null) {
			if (object_contains_str(val as any, target, rm_nontext, rm_case, max_d, d + 1)) return true
		}
	}

	return false
}
export function get_contained(val: string | object, targets: (string | RegExp)[], rm_nontext = false, rm_case = false) {
	return typeof val === "string"
		? targets.find((target) => str_contains(val, target, rm_nontext, rm_case))
		: targets.find((target) => object_contains_str(val, target, rm_nontext, rm_case))
}
