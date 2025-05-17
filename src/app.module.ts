import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NotionModule } from './notion/notion.module'
import { TelegramModule } from './telegram/telegram.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		TelegramModule,
		NotionModule
	]
})
export class AppModule {}
