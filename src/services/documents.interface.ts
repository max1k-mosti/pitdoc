export interface ICheck {
	customer: ICustomer
	date: string
	bookings: IBooking[]
	number: string
	total_sum: number
}
export interface IAct extends ICheck {
	period: string
}
interface ICustomer {
	title: string
	code: string
	address: string
	manager?: string
}

export interface IBooking {
	nights: number
	price: number
	checkInDate: string
	checkOutDate: string
}
