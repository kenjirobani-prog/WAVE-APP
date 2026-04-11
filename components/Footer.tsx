export default function Footer() {
  return (
    <footer>
      <div
        style={{
          borderTop: '0.5px solid #e2e8f0',
          padding: '12px 16px',
          textAlign: 'center',
          background: '#ffffff',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          本サービスの波予報はAIおよび気象数値モデルによる自動生成です。
          実際のコンディションと異なる場合があります。
          海に入る際は現地の状況を必ずご自身でご確認ください。
        </p>
      </div>
    </footer>
  )
}
