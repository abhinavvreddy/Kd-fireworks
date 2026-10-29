import os
import html
import logging
import datetime
import requests
from config import Config

logger = logging.getLogger("kanakadurga_email")

class EmailService:
    @staticmethod
    def format_rupee(amount) -> str:
        try:
            val = float(amount)
            return f"₹{val:,.0f}"
        except Exception:
            return f"₹{amount}"

    @staticmethod
    def send_order_notification_email(order: dict) -> dict:
        """
        Sends an automatic new-order alert email to the store administrator using Resend.
        Safe and non-blocking: never raises exceptions that could fail order placement.
        """
        api_key = Config.RESEND_API_KEY
        admin_email = Config.ADMIN_EMAIL
        from_email = Config.RESEND_FROM_EMAIL or "KanakaDurga FireWorks <onboarding@resend.dev>"

        if not api_key:
            logger.warning("RESEND_API_KEY is not configured. Email notification skipped.")
            return {"success": False, "skipped": True, "reason": "RESEND_API_KEY not configured"}

        if not admin_email:
            logger.warning("ADMIN_EMAIL is not configured. Email notification skipped.")
            return {"success": False, "skipped": True, "reason": "ADMIN_EMAIL not configured"}

        try:
            order_number = html.escape(str(order.get("orderNumber", "N/A")))
            customer_name = html.escape(str(order.get("customerName", "Guest Resident")))
            customer_phone = html.escape(str(order.get("customerPhone", "N/A")))
            community_name = html.escape(str(order.get("communityName", "Attapur Society")))

            addr = order.get("deliveryAddress", {})
            block = html.escape(str(addr.get("block", "N/A")))
            floor = html.escape(str(addr.get("floor", "")))
            flat = html.escape(str(addr.get("flat", "N/A")))
            landmark = html.escape(str(addr.get("landmark", "")))
            delivery_instructions = html.escape(str(addr.get("deliveryInstructions", "")))

            subtotal_val = float(order.get("subtotal", 0))
            delivery_fee_val = float(order.get("deliveryFee", 0))
            total_amount_val = float(order.get("totalAmount", 0))
            payment_method = html.escape(str(order.get("paymentMethod", "COD")))
            payment_status = html.escape(str(order.get("paymentStatus", "Pending Collection")))
            order_status = html.escape(str(order.get("orderStatus", "Placed")))

            # Format created date
            created_at_raw = order.get("createdAt")
            if created_at_raw:
                try:
                    dt = datetime.datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                    # Display in readable format
                    created_at_str = dt.strftime("%d %b %Y, %I:%M %p UTC")
                except Exception:
                    created_at_str = str(created_at_raw)
            else:
                created_at_str = datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")

            # Admin link
            order_id = str(order.get("_id") or order.get("id", ""))
            frontend_url = Config.get_frontend_url()
            admin_order_url = f"{frontend_url}/admin?orderId={order_id}"

            # Build items rows
            items = order.get("items", [])
            items_html_rows = []
            items_text_lines = []

            for item in items:
                item_name = html.escape(str(item.get("name", "Cracker Item")))
                item_sku = html.escape(str(item.get("sku", "")))
                qty = int(item.get("quantity", 1))
                unit_price = float(item.get("unitPrice", 0))
                total_price = float(item.get("totalPrice", unit_price * qty))

                items_html_rows.append(f"""
                <tr style="border-bottom: 1px solid #1E293B;">
                  <td style="padding: 12px 10px; font-size: 13px; color: #FFFFFF; font-weight: 500;">
                    {item_name}
                    {f'<span style="display: block; font-size: 11px; color: #94A3B8; font-family: monospace;">SKU: {item_sku}</span>' if item_sku else ''}
                  </td>
                  <td style="padding: 12px 10px; font-size: 13px; color: #E2E8F0; text-align: center; font-family: monospace;">
                    {qty}
                  </td>
                  <td style="padding: 12px 10px; font-size: 13px; color: #CBD5E1; text-align: right; font-family: monospace;">
                    {EmailService.format_rupee(unit_price)}
                  </td>
                  <td style="padding: 12px 10px; font-size: 13px; color: #F59E0B; text-align: right; font-weight: 600; font-family: monospace;">
                    {EmailService.format_rupee(total_price)}
                  </td>
                </tr>
                """)

                items_text_lines.append(f" - {item.get('name')} (Qty: {qty}) @ {EmailService.format_rupee(unit_price)} = {EmailService.format_rupee(total_price)}")

            items_html_table = "".join(items_html_rows)
            items_text_block = "\n".join(items_text_lines)

            # Flat/Floor description
            flat_desc = f"Flat {flat}"
            if floor:
                flat_desc += f", Floor {floor}"

            # Plain text fallback
            text_content = f"""
KANAKADURGA FIREWORKS - NEW ORDER RECEIVED
Motto: “ఆనందానికి No Limits!” (Attapur, Hyderabad)
==================================================

ORDER DETAILS:
Order Number: {order.get('orderNumber')}
Received At: {created_at_str}
Payment Method: {payment_method} ({payment_status})
Order Status: {order_status}

CUSTOMER & DELIVERY:
Name: {order.get('customerName')}
Phone: {order.get('customerPhone')}
Society: {order.get('communityName')}
Block: {block} | {flat_desc}
{f'Landmark: {addr.get("landmark")}' if addr.get("landmark") else ''}
{f'Instructions: {addr.get("deliveryInstructions")}' if addr.get("deliveryInstructions") else ''}

ORDERED ITEMS:
{items_text_block}

FINANCIAL BREAKDOWN:
Subtotal: {EmailService.format_rupee(subtotal_val)}
Delivery Fee: {EmailService.format_rupee(delivery_fee_val)}
Total COD Amount to Collect: {EmailService.format_rupee(total_amount_val)}

View this order in Admin Console:
{admin_order_url}
"""

            # Responsive HTML email
            html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order #{order_number} Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070B19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #070B19; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #0F172A; border: 1px solid #D97706; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Festive Navy / Gold Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0B132B 0%, #1E1B4B 50%, #0B132B 100%); padding: 28px 24px; border-bottom: 2px solid #F59E0B; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #F59E0B; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">
                🎆 Store Management Notification
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; font-family: Georgia, serif; letter-spacing: 0.5px;">
                KanakaDurga FireWorks
              </h1>
              <div style="font-size: 13px; color: #FCD34D; font-weight: 600; margin-top: 4px;">
                “ఆనందానికి No Limits!” · Attapur, Hyderabad
              </div>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background-color: #1E293B; padding: 14px 24px; border-bottom: 1px solid #334155;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #10B981; color: #022C22; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; letter-spacing: 1px;">
                      NEW ORDER PLACED
                    </span>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 16px; font-weight: 800; font-family: monospace; color: #F59E0B;">
                      {order_number}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 24px;">

              <!-- Key Metrics Bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="33%" style="background-color: #090D1A; padding: 12px; border-radius: 8px; border: 1px solid #1E293B; text-align: center;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #94A3B8; font-weight: 600;">COD Total</div>
                    <div style="font-size: 18px; font-weight: 800; color: #10B981; font-family: monospace; margin-top: 4px;">
                      {EmailService.format_rupee(total_amount_val)}
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="30%" style="background-color: #090D1A; padding: 12px; border-radius: 8px; border: 1px solid #1E293B; text-align: center;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #94A3B8; font-weight: 600;">Items Count</div>
                    <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; font-family: monospace; margin-top: 4px;">
                      {len(items)} items
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="29%" style="background-color: #090D1A; padding: 12px; border-radius: 8px; border: 1px solid #1E293B; text-align: center;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #94A3B8; font-weight: 600;">Payment Mode</div>
                    <div style="font-size: 14px; font-weight: 800; color: #F59E0B; margin-top: 6px;">
                      100% COD
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Customer & Society Delivery Box -->
              <div style="background-color: #090D1A; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #F59E0B; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #1E293B; padding-bottom: 6px;">
                  📍 Resident & Delivery Details
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 13px;">
                  <tr>
                    <td width="130" style="color: #94A3B8; font-weight: 500;">Customer Name:</td>
                    <td style="color: #FFFFFF; font-weight: 600;">{customer_name}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8; font-weight: 500;">Phone Number:</td>
                    <td style="color: #38BDF8; font-weight: 600; font-family: monospace;">
                      <a href="tel:{customer_phone}" style="color: #38BDF8; text-decoration: none;">{customer_phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8; font-weight: 500;">Gated Community:</td>
                    <td style="color: #FCD34D; font-weight: 600;">{community_name}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8; font-weight: 500;">Block & Flat:</td>
                    <td style="color: #FFFFFF;"><strong>{block}</strong> — {flat_desc}</td>
                  </tr>
                  {f'<tr><td style="color: #94A3B8;">Landmark:</td><td style="color: #CBD5E1;">{landmark}</td></tr>' if landmark else ''}
                  {f'<tr><td style="color: #94A3B8;">Instructions:</td><td style="color: #E2E8F0; font-style: italic;">"{delivery_instructions}"</td></tr>' if delivery_instructions else ''}
                  <tr>
                    <td style="color: #94A3B8; font-weight: 500;">Order Placed At:</td>
                    <td style="color: #CBD5E1; font-size: 12px;">{created_at_str}</td>
                  </tr>
                </table>
              </div>

              <!-- Ordered Items Table -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #F59E0B; letter-spacing: 1px; margin-bottom: 10px;">
                  📦 Ordered Fireworks
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; background-color: #090D1A; border: 1px solid #1E293B; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #1E293B; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; color: #94A3B8;">
                      <th align="left" style="padding: 10px;">Item / SKU</th>
                      <th align="center" style="padding: 10px;">Qty</th>
                      <th align="right" style="padding: 10px;">Unit Price</th>
                      <th align="right" style="padding: 10px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items_html_table}
                  </tbody>
                </table>
              </div>

              <!-- Payment & Total Summary -->
              <div style="background-color: #090D1A; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 13px;">
                  <tr>
                    <td style="color: #94A3B8;">Crackers Subtotal:</td>
                    <td align="right" style="color: #FFFFFF; font-family: monospace;">{EmailService.format_rupee(subtotal_val)}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">Doorstep Delivery Charge ({community_name}):</td>
                    <td align="right" style="color: #FFFFFF; font-family: monospace;">{EmailService.format_rupee(delivery_fee_val)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #334155;">
                    <td style="font-size: 15px; font-weight: 800; color: #F59E0B; padding-top: 10px;">
                      Total COD Cash to Collect:
                    </td>
                    <td align="right" style="font-size: 18px; font-weight: 800; color: #10B981; font-family: monospace; padding-top: 10px;">
                      {EmailService.format_rupee(total_amount_val)}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="font-size: 11px; color: #94A3B8; padding-top: 4px;">
                      * Cash on Delivery: Delivery agent collects exact cash upon doorstep handover.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Primary CTA Button -->
              <div style="text-align: center; margin-bottom: 12px;">
                <a href="{admin_order_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #090D1A; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                  View Order in Admin Console →
                </a>
              </div>

              <div style="text-align: center; font-size: 11px; color: #64748B; margin-top: 8px;">
                Direct URL: <a href="{admin_order_url}" style="color: #38BDF8; word-break: break-all;">{admin_order_url}</a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #070B19; padding: 20px; border-top: 1px solid #1E293B; text-align: center; font-size: 11px; color: #64748B; line-height: 1.6;">
              <strong style="color: #94A3B8;">KanakaDurga FireWorks</strong> · Attapur Main Road, Hyderabad, Telangana 500048<br>
              Order updates & questions: Call store support at <strong style="color: #CBD5E1;">+91 8121317368</strong><br>
              <em>This automated transaction notification is sent strictly to the store owner upon verified order placement.</em>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

            # Post to Resend API
            subject = f"🎆 New Order #{order.get('orderNumber')} Received - {EmailService.format_rupee(total_amount_val)} (COD) | KanakaDurga FireWorks"
            payload = {
                "from": from_email,
                "to": [admin_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            res = requests.post(
                "https://api.resend.com/emails",
                headers=headers,
                json=payload,
                timeout=12
            )

            if res.status_code in [200, 201]:
                res_data = res.json()
                resend_id = res_data.get("id")
                logger.info(f"Resend email sent successfully for order {order_number}. Resend ID: {resend_id}")
                return {
                    "success": True,
                    "resendId": resend_id,
                    "recipient": admin_email,
                    "sender": from_email,
                    "sentAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
            else:
                logger.error(f"Resend API error for order {order_number}: HTTP {res.status_code} - {res.text}")
                return {
                    "success": False,
                    "error": res.text,
                    "statusCode": res.status_code,
                    "attemptedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }

        except Exception as e:
            logger.error(f"Failed to send Resend email for order: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "attemptedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
