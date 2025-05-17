import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as PDFDocument from 'pdfkit'
import { formatMoney } from 'src/utils/utils'
import { IAct, ICheck } from './documents.interface'

@Injectable()
export class DocumentsService {
	constructor() {}

	async generateCheck(data?: ICheck) {
		const doc = new PDFDocument({
			size: 'A4',
			margins: {
				top: 30,
				bottom: 50,
				left: 50,
				right: 30
			}
		})
		doc.registerFont('e-Ukraine-Bold', 'fonts/e-Ukraine-Bold.otf')
		doc.registerFont('e-Ukraine-Regular', 'fonts/e-Ukraine-Regular.otf')
		const filePath = doc.pipe(fs.createWriteStream(`Рахунок.pdf`))

		doc.image('logo.jpg', 50, 30, { width: 120 })
		doc.font('e-Ukraine-Bold').fontSize(18).text('РАХУНОК-ФАКТУРА', 265, 40)
		doc.font('e-Ukraine-Bold').fontSize(9).text('Постачальник', 50, 110)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				'Фізична особа-підприємець\nМостипан Максим Русланович\nКод ЄДРПОУ 3662106716\nАдреса: 51900, Дніпропетровська область,\nм.Кам’янське,проспект Гімназичний, 73',
				50,
				130,
				{ lineGap: 2 }
			)
		doc.font('e-Ukraine-Bold').fontSize(9).text('Платник', 50, 210)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				`${data.customer.title}\nкод ЄДРПОУ ${data.customer.code}\nАдреса: ${data.customer.address}`,
				50,
				230,
				{
					width: 200,
					lineGap: 2
				}
			)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Дата', 350, 110)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`${data.date}`, 405, 110)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Номер', 350, 130)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`${data.number}`, 405, 130)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Загальна\nсумма', 350, 150)
		doc
			.font('e-Ukraine-Bold')
			.fontSize(8)
			.text(`${formatMoney(data.total_sum)} грн`, 405, 153)
		doc.font('e-Ukraine-Bold').fontSize(8).text('IBAN', 350, 200)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				'UA593220010000026005350072636\nу банку «АТ «УНІВЕРСАЛ БАНК»»,\nМФО 322001',
				405,
				190
			)
		const table = [
			[
				{ colSpan: 3, text: 'Найменування' },
				'Од. вим.',
				'Кількість',
				'Ціна без ПДВ,грн',
				'Сума без ПДВ, грн.'
			],
			...data.bookings.map(booking => {
				return [
					{
						colSpan: 3,
						text: `Бронювання місць та проживання в мотелі «PitStop» з ${booking.checkInDate} р. по ${booking.checkOutDate} р.`
					},
					'діб.',
					`${booking.nights},000`,
					`${formatMoney(booking.price)}`,
					`${formatMoney(booking.price * Number(booking.nights))}`
				]
			})
		]
		doc.table({
			data: table,
			rowStyles: i => {
				return i < 1
					? {
							border: [1, 0, 0, 0],
							padding: [8, 4, 4, 4]
						}
					: {
							border: i === table.length - 1 ? [0, 0, 1, 0] : false,
							backgroundColor: i % 2 === 1 ? '#F4F6F6' : null,
							padding: [8, 4, 4, 4]
						}
			},
			position: { x: 50, y: 300 }
		})
		const tableHeight = data.bookings.length * 21
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text(
				`Всього   ${formatMoney(data.total_sum)} грн`,
				445,
				tableHeight + 380
			)
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text('Виписав', 50, 500 + tableHeight)
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text('Мостипан МАКСИМ', 250, 500 + tableHeight)
		doc
			.moveTo(100, 510 + tableHeight)
			.lineTo(240, 510 + tableHeight)
			.lineWidth(1)
			.strokeColor('#000')
			.stroke()

		doc.end()
		console.log('Чек успішно сгенеровано')
		return filePath
	}
	async generateAct(data?: IAct) {
		const doc = new PDFDocument({
			size: 'A4',
			margins: {
				top: 30,
				bottom: 50,
				left: 50,
				right: 30
			}
		})
		doc.registerFont('e-Ukraine-Bold', 'fonts/e-Ukraine-Bold.otf')
		doc.registerFont('e-Ukraine-Regular', 'fonts/e-Ukraine-Regular.otf')
		const filePath = doc.pipe(fs.createWriteStream(`Акт.pdf`))

		doc.image('logo.jpg', 50, 30, { width: 120 })
		doc.font('e-Ukraine-Bold').fontSize(18).text('АКТ НАДАНИХ ПОСЛУГ', 265, 40)
		doc.font('e-Ukraine-Bold').fontSize(9).text('Виконавець', 50, 110)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				'Фізична особа-підприємець\nМостипан Максим Русланович\nКод ЄДРПОУ 3662106716\nАдреса: 51900, Дніпропетровська область,\nм.Кам’янське,проспект Гімназичний, 73',
				50,
				130,
				{ lineGap: 2 }
			)
		doc.font('e-Ukraine-Bold').fontSize(9).text('Замовник', 50, 210)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				`${data.customer.title}\nкод ЄДРПОУ ${data.customer.code}\nАдреса: ${data.customer.address}`,
				50,
				230,
				{
					width: 200,
					lineGap: 2
				}
			)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Дата', 350, 110)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`${data.date}`, 410, 110)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Номер', 350, 130)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`${data.number}`, 410, 130)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Місце\nскладання', 350, 150)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`м. Кам'янське`, 410, 150)
		doc.font('e-Ukraine-Bold').fontSize(8).text('Період', 350, 200)
		doc.font('e-Ukraine-Regular').fontSize(8).text(`${data.period}`, 410, 200)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				`Фізична особа – підприємець Мостипан Максим Русланович надав , а ${data.customer.title} прийняв наступні послуги :`,
				50,
				295
			)
		const table = [
			[
				{ colSpan: 3, text: 'Послуга' },
				'Од. вим.',
				'Кількість',
				'Ціна без ПДВ,грн',
				'Сума без ПДВ, грн.'
			],
			...data.bookings.map(booking => [
				{
					colSpan: 3,
					text: `Бронювання місць та проживання в мотелі «PitStop» з ${booking.checkInDate} р. по ${booking.checkOutDate} р.`
				},
				'діб.',
				`${booking.nights}`,
				`${formatMoney(booking.price)}`,
				`${formatMoney(booking.price * booking.nights)}`
			])
		]
		doc.table({
			data: table,
			rowStyles: i => {
				return i < 1
					? {
							border: [1, 0, 0, 0],
							padding: [8, 4, 4, 4]
						}
					: {
							border: i === table.length - 1 ? [0, 0, 1, 0] : false,
							backgroundColor: i % 2 === 1 ? '#F4F6F6' : null,
							padding: [8, 4, 4, 4]
						}
			},
			position: { x: 50, y: 325 }
		})
		const tableHeight = data.bookings.length * 26
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text(
				`Всього   ${formatMoney(data.total_sum)} грн`,
				445,
				tableHeight + 390
			)
		doc
			.font('e-Ukraine-Regular')
			.fontSize(8)
			.text(
				`Послуги надані в повному обсязі. Замовник та Виконавець не мають претензій один до одного.`,
				50,
				420 + tableHeight
			)
		doc.rect(50, tableHeight + 450, 200, 21).fill('#1e1e1e')
		doc
			.font('e-Ukraine-Regular')
			.fontSize(10)
			.fill('white')
			.text('Виконавець', 115, tableHeight + 453)
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.fill('black')
			.text('ФОП Мостипан Максим Русланович', 50, tableHeight + 480)
		doc
			.moveTo(50, 530 + tableHeight)
			.lineTo(250, 530 + tableHeight)
			.lineWidth(1)
			.strokeColor('#000')
			.stroke()
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text('Мостипан МАКСИМ', 50, 535 + tableHeight)
		doc.rect(365, tableHeight + 450, 200, 21).fill('#1e1e1e')
		doc
			.font('e-Ukraine-Regular')
			.fontSize(10)
			.fill('white')
			.text('Замовник', 440, tableHeight + 453)
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.fill('black')
			.text(`${data.customer.title}`, 365, tableHeight + 480)
		doc
			.moveTo(365, 530 + tableHeight)
			.lineTo(565, 530 + tableHeight)
			.lineWidth(1)
			.strokeColor('#000')
			.stroke()
		doc
			.font('e-Ukraine-Bold')
			.fontSize(9)
			.text(`Керівник ${data.customer.manager}`, 365, 535 + tableHeight)
		doc.end()
	}
}
