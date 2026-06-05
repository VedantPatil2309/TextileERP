def safe_divide(a, b):
    return a / b if b != 0 else 0


def calculate_oee(machine):
    availability = safe_divide(
        machine["available_time"] - machine["downtime"],
        machine["available_time"]
    )
    performance = safe_divide(
        machine["total_output"],
        machine["available_time"]
    )
    quality = safe_divide(
        machine["good_output"],
        machine["total_output"]
    )
    return availability * performance * quality


def calculate_otd(sales):
    return sales["delivered_date"] <= sales["promised_date"]


def calculate_yield(order):
    return safe_divide(order["actual_qty"], order["input_qty"])


def calculate_margin(fin):
    return safe_divide(
        fin["revenue"] - fin["cost"],
        fin["revenue"]
    )
