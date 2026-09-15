import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MetricsController } from "./metrics.controller";

@Module({
  imports: [AuthModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
