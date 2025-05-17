export function formatMoney(amount?: number) {
	return amount?.toFixed(2).replace('.', ',') ?? 0
}
export function formatDateToPeriodString(minDate: Date, maxDate: Date) {
	const formattedMin = minDate.toLocaleDateString('ru')
	const formattedMax = maxDate.toLocaleDateString('ru')
	return `${formattedMin} - ${formattedMax}`
}
