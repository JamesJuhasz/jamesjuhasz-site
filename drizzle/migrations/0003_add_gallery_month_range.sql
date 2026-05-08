ALTER TABLE "galleries" ADD COLUMN "start_month" date;--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "end_month" date;--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2023-03-01', "end_month" = DATE '2023-05-01' WHERE slug = 'spring-2023';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2022-12-01', "end_month" = DATE '2023-02-01' WHERE slug = 'winter-202223';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2022-09-01', "end_month" = DATE '2022-11-01' WHERE slug = 'fall2022';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2022-06-01', "end_month" = DATE '2022-08-01' WHERE slug = 'summer-2022';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2022-03-01', "end_month" = DATE '2022-05-01' WHERE slug = 'spring-2022';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2021-12-01', "end_month" = DATE '2022-02-01' WHERE slug = 'winter-202122';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2021-09-01', "end_month" = DATE '2021-11-01' WHERE slug = 'fall-2021';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2021-06-01', "end_month" = DATE '2021-08-01' WHERE slug = 'summer-2021';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2021-03-01', "end_month" = DATE '2021-05-01' WHERE slug = 'spring-2021';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2020-12-01', "end_month" = DATE '2021-02-01' WHERE slug = 'winter-202021';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2020-09-01', "end_month" = DATE '2020-11-01' WHERE slug = 'fall-2020';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2020-06-01', "end_month" = DATE '2020-08-01' WHERE slug = 'summer-2020';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2020-03-01', "end_month" = DATE '2020-05-01' WHERE slug = 'spring-2020';--> statement-breakpoint
UPDATE "galleries" SET "start_month" = DATE '2017-01-01', "end_month" = DATE '2019-12-01' WHERE slug = 'junior-years';
