-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PACKETA', 'COURIER', 'PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethod" "DeliveryMethod",
ADD COLUMN     "deliveryPrice" INTEGER;
