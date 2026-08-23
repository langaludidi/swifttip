import React, { forwardRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const RealQRCode = forwardRef(function RealQRCode({ value, size = 200 }, ref) {
  return (
    <div
      role="img"
      aria-label="SwiftTip tipping QR code"
      style={{
        width: size,
        height: size,
        background: '#fff',
        borderRadius: 16,
        display: 'grid',
        placeItems: 'center',
        padding: 12,
        boxShadow: '0 4px 18px -8px rgba(8,60,74,0.3)',
      }}
    >
      <QRCodeCanvas
        ref={ref}
        value={value}
        size={size - 24}
        level="M"
        marginSize={2}
        bgColor="#FFFFFF"
        fgColor="#052B36"
        title="SwiftTip tipping QR code"
      />
    </div>
  );
});

export default RealQRCode;
