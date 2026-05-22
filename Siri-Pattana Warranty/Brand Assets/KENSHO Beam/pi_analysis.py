import sys
sys.stdout.reconfigure(encoding='utf-8')

SEP = '=' * 70

pi = {
    'R4': [
        ('H4', 11, 61.00),
        ('H11', 8, 48.00),
        ('H7', 5, 48.00),
        ('9005/HB3', 3, 48.00),
        ('9006/HB4', 2, 48.00),
        ('D2H/D4H', 1, 48.00),
    ],
    'R9S': [
        ('H4', 14, 80.00),
        ('H11', 11, 65.00),
        ('H7', 6, 65.00),
        ('9005/HB3', 4, 65.00),
        ('9006/HB4', 2, 65.00),
        ('D2H/D4H', 3, 65.00),
    ],
    'Q13': [
        ('H4', 7, 98.00),
        ('H11', 5, 83.00),
        ('H7', 3, 83.00),
        ('9005/HB3', 2, 83.00),
        ('D2H/D4H', 1, 83.00),
    ],
    'R14-APP': [
        ('H4', 5, 110.00),
        ('H11', 3, 95.00),
        ('H7', 2, 95.00),
        ('9005/HB3', 1, 95.00),
        ('D2H/D4H', 1, 95.00),
    ],
}

series_map = {
    'R4': 'LX-15 PureLite',
    'R9S': 'LX-20 TurboFlux',
    'Q13': 'LX-30 HyperBeam',
    'R14-APP': 'LX-40 LumiSync'
}

# ==========================================
# 1. PI COST BREAKDOWN
# ==========================================
print(SEP)
print('PI COST BREAKDOWN (CNY)')
print(SEP)

grand_qty = 0
grand_cny = 0

for model, items in pi.items():
    model_qty = sum(i[1] for i in items)
    model_cost = sum(i[1] * i[2] for i in items)
    grand_qty += model_qty
    grand_cny += model_cost
    
    print(f'\n{model} ({series_map[model]}): {model_qty} pairs = ¥{model_cost:,.2f}')
    for socket, qty, price in items:
        print(f'  {socket:12s}  {qty:2d} x ¥{price:6.2f} = ¥{qty*price:8.2f}')

print(f'\n{SEP}')
print(f'TOTAL: {grand_qty} pairs = ¥{grand_cny:,.2f}')
print(SEP)

# ==========================================
# 2. EXCHANGE RATE SCENARIOS
# ==========================================
print(f'\n{SEP}')
print('EXCHANGE RATE CONVERSION (CNY -> THB)')
print(SEP)

for rate in [4.7, 4.9, 5.1]:
    thb = grand_cny * rate
    print(f'  @ 1 CNY = {rate} THB:  ¥{grand_cny:,.2f} = B{thb:,.2f}  (avg B{thb/grand_qty:.2f}/pair)')

# ==========================================
# 3. ESTIMATED LANDED COST
# ==========================================
rate = 4.9
base_thb = grand_cny * rate

print(f'\n{SEP}')
print(f'ESTIMATED LANDED COST (@ 1 CNY = {rate} THB)')
print(SEP)
print(f'  FOB product cost:           B{base_thb:>10,.2f}')

ship_low = 3500
ship_high = 6000
ship_mid = (ship_low + ship_high) / 2
print(f'  Shipping (est.):            B{ship_low:>10,} - B{ship_high:,}')

duty_rate = 0.10
duty = base_thb * duty_rate
print(f'  Import duty (~10%):         B{duty:>10,.2f}')

vat_base = base_thb + duty + ship_mid
vat = vat_base * 0.07
print(f'  VAT (7%):                   B{vat:>10,.2f}')

fees = 1500
print(f'  Customs/broker/misc:        B{fees:>10,}')

bank = 500
print(f'  Bank transfer fee:          B{bank:>10,}')

total_extra = ship_mid + duty + vat + fees + bank
total_landed = base_thb + total_extra

print(f'\n  TOTAL EXTRA COSTS:          B{total_extra:>10,.2f}')
print(f'  TOTAL LANDED COST:          B{total_landed:>10,.2f}')
print(f'  Average per pair:           B{total_landed/grand_qty:>10,.2f}')
print(f'  Extra costs = ~{total_extra/base_thb*100:.0f}% on top of FOB')

multiplier = total_landed / base_thb
print(f'  Landed cost multiplier: x{multiplier:.3f}')

# ==========================================
# 4. PER-MODEL ANALYSIS
# ==========================================
wholesale = {'R4': 1490, 'R9S': 2190, 'Q13': 2890, 'R14-APP': 3490}
retail = {'R4': 2490, 'R9S': 3490, 'Q13': 4490, 'R14-APP': 5490}

print(f'\n{SEP}')
print('PER-MODEL LANDED COST vs PRICING')
print(SEP)

total_ws_revenue = 0
total_rt_revenue = 0

for model, items in pi.items():
    model_qty = sum(i[1] for i in items)
    model_cny = sum(i[1] * i[2] for i in items)
    model_landed = model_cny * rate * multiplier
    avg_landed = model_landed / model_qty
    ws = wholesale[model]
    rt = retail[model]
    
    ws_margin = (ws - avg_landed) / ws * 100
    rt_margin = (rt - avg_landed) / rt * 100
    store_margin = (rt - ws) / rt * 100
    ws_profit = (ws - avg_landed) * model_qty
    
    total_ws_revenue += ws * model_qty
    total_rt_revenue += rt * model_qty
    
    print(f'\n--- {model} ({series_map[model]}) ---')
    print(f'  Avg landed cost/pair:  B{avg_landed:,.0f}')
    print(f'  Wholesale price:       B{ws:,}  | your margin: {ws_margin:.1f}% | profit: B{ws_profit:,.0f} ({model_qty}prs)')
    print(f'  Retail price:          B{rt:,}  | end-to-end: {rt_margin:.1f}%')
    print(f'  Store margin:          {store_margin:.1f}%')
    
    print(f'  Per-socket breakdown:')
    for socket, qty, price_cny in items:
        landed = price_cny * rate * multiplier
        print(f'    {socket:12s}  ¥{price_cny:>3.0f} -> B{landed:>5,.0f}/pair  |  WS profit B{ws-landed:>5,.0f}  |  RT profit B{rt-landed:>5,.0f}')

# ==========================================
# 5. GRAND SUMMARY
# ==========================================
print(f'\n{SEP}')
print('GRAND SUMMARY')
print(SEP)

total_ws_profit = total_ws_revenue - total_landed
total_store_profit = total_rt_revenue - total_ws_revenue

print(f'  Your investment:       B{total_landed:>10,.0f}  (product + shipping + duty + VAT + fees)')
print(f'  Wholesale revenue:     B{total_ws_revenue:>10,}')
print(f'  YOUR PROFIT:           B{total_ws_profit:>10,.0f}  ({total_ws_profit/total_ws_revenue*100:.1f}% margin)')
print(f'  Retail revenue:        B{total_rt_revenue:>10,}')
print(f'  Stores total profit:   B{total_store_profit:>10,}')
print(f'\n  ROI: {total_ws_profit/total_landed*100:.0f}% return on investment')
