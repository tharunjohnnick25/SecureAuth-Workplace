import qrcode

url = "exp://192.168.1.5:8081"
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\71b53beb-2ab9-4ebc-b8eb-d208e7f8ecc9\\expo_qr_code_latest.png")
print("QR Code generated at C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\71b53beb-2ab9-4ebc-b8eb-d208e7f8ecc9\\expo_qr_code_latest.png")
