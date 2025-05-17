import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@notionhq/client'
import { format, max, min, parse } from 'date-fns'
import { formatDateToPeriodString } from 'src/utils/utils'

@Injectable()
export class NotionService {
	getCompanyBookingsById(selectedBookings: string[]) {
		throw new Error('Method not implemented.')
	}
	private readonly secretKey: string
	private readonly notion: Client

	constructor(private readonly configService: ConfigService) {
		this.secretKey = this.configService.get<string>('NOTION_SECRET_KEY')
		this.notion = new Client({ auth: this.secretKey })
	}
	async getCompanies() {
		const DATABASE_ID = '1e5c17172f24802982b5ccf7c4938d6f'
		const response = await this.notion.databases.query({
			database_id: DATABASE_ID
		})

		const data = response.results

		return data.map((page: any) => {
			const name = page.properties.Name.title[0].plain_text
			return {
				id: page.id,
				name: name
			}
		})
	}

	async getCompanyByID(companyId: string) {
		const company: any = await this.notion.pages.retrieve({
			page_id: companyId
		})

		return company
	}

	async getCompanyBookings(companyId: string) {
		const company = await this.getCompanyByID(companyId)
		const bookingsRelation = company.properties?.Bookings?.relation

		const bookingPages = await Promise.all(
			bookingsRelation.map((rel: { id: string }) =>
				this.notion.pages.retrieve({ page_id: rel.id })
			)
		)
		const filteredBookings = bookingPages.filter((booking: any) => {
			const documentsRelation = booking.properties.Documents.relation
			return documentsRelation.length === 0
		})

		return filteredBookings.map(page => {
			return {
				id: page.id,
				number: page.properties?.['Number Booking'].rich_text?.[0]?.plain_text,
				name: page.properties.Name.title[0].plain_text,
				price: page.properties?.['Price per night'].number,
				checkInDate: format(page.properties?.Arrival.date.start, 'dd.MM.yyyy'),
				checkOutDate: format(
					page.properties?.Departure.date.start,
					'dd.MM.yyyy'
				),
				nights: page.properties.Nights.formula.string.split(' ')?.[0],
				companyId
			}
		})
	}

	async getChecksWithoutActs() {
		const DATABASE_ID = '1e4c17172f2480459b1fc3353c934752'
		const response = await this.notion.databases.query({
			database_id: DATABASE_ID,
			filter: {
				property: 'Type',
				select: {
					equals: 'Check'
				}
			}
		})

		const data = response.results.filter((check: any) => {
			const actRelation = check.properties.Act.relation
			return actRelation.length === 0
		})

		return data.map((page: any) => {
			return {
				id: page.id,
				name: page.properties?.Name.title[0].plain_text,
				number: page.properties?.Number.number
			}
		})
	}

	async getBookingByID(bookingId: string) {
		const page: any = await this.notion.pages.retrieve({ page_id: bookingId })
		return {
			id: page.id,
			number: page.properties?.['Number Booking'].rich_text?.[0]?.plain_text,
			name: page.properties.Name.title[0].plain_text,
			companyId: page.properties.Company.relation[0].id,
			checkInDate: format(page.properties?.Arrival.date.start, 'dd.MM.yyyy'),
			checkOutDate: format(page.properties?.Departure.date.start, 'dd.MM.yyyy'),
			nights: page.properties.Nights.formula.string.split(' ')?.[0],
			total_sum: page.properties?.['Total price'].formula.number,
			price: page.properties?.['Price per night'].number
		}
	}
	async getBookingsByIDs(bookingIds: { id: string }[]) {
		const bookings = await Promise.all(
			bookingIds.map(obj => this.getBookingByID(obj.id))
		)

		return bookings
	}
	async createCheck(bookingIds: string[], companyId: string, number: number) {
		const DATABASE_ID = '1e4c17172f2480459b1fc3353c934752'
		const response = this.notion.pages.create({
			parent: {
				type: 'database_id',
				database_id: DATABASE_ID
			},
			properties: {
				Name: {
					title: [
						{
							text: {
								content: 'Рахунок'
							}
						}
					]
				},
				Type: {
					select: {
						name: 'Check'
					}
				},
				Date: {
					date: {
						start: new Date().toISOString().split('T')[0]
					}
				},
				Status: {
					status: {
						name: 'Done'
					}
				},
				Booking: {
					type: 'relation',
					relation: bookingIds.map(bookingId => ({ id: bookingId }))
				},
				Company: {
					type: 'relation',
					relation: [{ id: companyId }]
				},
				Number: {
					number: number + 1
				}
			}
		})
		return response
	}
	async getCheckById(checkId: string) {
		const check: any = await this.notion.pages.retrieve({
			page_id: checkId
		})
		const company: any = await this.getCompanyByID(
			check.properties.Company.relation[0].id
		)
		let minDateArray: Date[] = []
		let maxDateArray: Date[] = []
		const bookings = await this.getBookingsByIDs(
			check.properties.Booking.relation
		)
		let totalSum: number = 0

		for (const booking of bookings) {
			totalSum += booking.price * booking.nights
			minDateArray.push(parse(booking.checkInDate, 'dd.MM.yyyy', new Date()))
			maxDateArray.push(parse(booking.checkOutDate, 'dd.MM.yyyy', new Date()))
		}

		return {
			customer: {
				id: company.id,
				title: company.properties.Name.title[0].plain_text,
				code: company.properties['ЄДРПОУ'].rich_text[0].plain_text,
				address: company.properties.Address.rich_text[0].plain_text,
				manager: company.properties.Manager.rich_text[0].plain_text
			},
			date: new Date().toLocaleDateString('ru'),
			bookings: bookings,
			number: check.properties.Number.number,
			total_sum: totalSum,
			period: formatDateToPeriodString(min(minDateArray), max(maxDateArray))
		}
	}
	async createAct(
		bookingIds: string[],
		companyId: string,
		number: number,
		checkId: string
	) {
		const DATABASE_ID = '1e4c17172f2480459b1fc3353c934752'
		const response = this.notion.pages.create({
			parent: {
				type: 'database_id',
				database_id: DATABASE_ID
			},
			properties: {
				Name: {
					title: [
						{
							text: {
								content: 'Акт виконаних робіт'
							}
						}
					]
				},
				Type: {
					select: {
						name: 'Act'
					}
				},
				Date: {
					date: {
						start: new Date().toISOString().split('T')[0]
					}
				},
				Status: {
					status: {
						name: 'Done'
					}
				},
				Booking: {
					type: 'relation',
					relation: bookingIds.map(bookingId => ({ id: bookingId }))
				},
				Company: {
					type: 'relation',
					relation: [{ id: companyId }]
				},
				Number: {
					number: number
				},
				Check: {
					type: 'relation',
					relation: [{ id: checkId }]
				}
			}
		})
		return response
	}

	async getLastNumber() {
		const DATABASE_ID = '1e4c17172f2480459b1fc3353c934752'
		const response = await this.notion.databases.query({
			database_id: DATABASE_ID,
			sorts: [
				{
					property: 'Number',
					direction: 'descending'
				}
			],
			page_size: 1
		})

		const result: any = response.results[0]

		return result.properties.Number.number ?? 49
	}
}
