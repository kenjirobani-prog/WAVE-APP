export type GlossaryTerm = {
  term: string
  reading: string
  description: string
  relatedTerms?: string[]
}

export type GlossaryCategory = {
  id: string
  label: string
  terms: GlossaryTerm[]
}

export const glossaryData: GlossaryCategory[] = [
  {
    id: 'wave',
    label: '波',
    terms: [
      { term: 'うねり', reading: 'うねり', description: '遠くの海で発生した波のエネルギーが伝わってくること。周期が長いほど力強い良い波になりやすい。' },
      { term: '周期', reading: 'しゅうき', description: '波と波の間隔（秒）。8秒以上でうねりが強く、5秒以下は風波でダンパーになりやすい。' },
      { term: '波高', reading: 'なみだか', description: '波の高さ。0.5m=ヒザ、0.8m=腰〜胸、1.2m=肩〜頭が目安。' },
      { term: 'キレた波', reading: 'きれたなみ', description: 'ピークからショルダーへ順番にきれいに割れる波。サーフィンに最も適した状態。' },
      { term: 'ダンパー', reading: 'だんぱー', description: '波全体が一気に崩れてしまう波。横に走れないのでサーフィンには不向き。' },
      { term: 'ワイド', reading: 'わいど', description: '波が横に広がりすぎて一気に崩れる状態。干潮×強うねりで発生しやすい。' },
      { term: 'グッドウェーブ', reading: 'ぐっどうぇーぶ', description: 'コンディションが良くきれいに割れる波の総称。' },
      { term: 'クローズアウト', reading: 'くろーずあうと', description: '全部の波が一気に崩れてしまい、どこにも乗れない状態。' },
      { term: 'セット', reading: 'せっと', description: '周期的に届く波のまとまり。良いセットが来ると大きめの波が連続して入ってくる。' },
      { term: 'ピーク', reading: 'ぴーく', description: '波が最初に割れ始める場所。ここに近いサーファーが優先権を持つ。' },
      { term: 'ショルダー', reading: 'しょるだー', description: 'ピークから横に広がる、まだ崩れていない波の斜面部分。' },
      { term: 'インサイド', reading: 'いんさいど', description: '岸に近いエリア。波が崩れた後のスープが多い。' },
      { term: 'アウト', reading: 'あうと', description: '沖側のエリア。ここで波を待つ。' },
      { term: 'フェイス', reading: 'ふぇいす', description: '波の滑る斜面部分。ライディングするところ。' },
      { term: 'チューブ', reading: 'ちゅーぶ', description: '波が巻き上がって筒状の空洞ができた状態。上級者の憧れ。' },
      { term: 'ホレた波', reading: 'ほれたなみ', description: '波面が急激に切り立ち、掘れ上がった波。パワーが強く中上級者向き。' },
      { term: 'トロい波', reading: 'とろいなみ', description: 'ゆっくりブレイクする厚い波。初心者が練習しやすい。' },
    ],
  },
  {
    id: 'wind',
    label: '風',
    terms: [
      { term: 'オフショア', reading: 'おふしょあ', description: '陸から海へ吹く風。波面を整えてクリーンな状態にする。サーフィンに最適。' },
      { term: 'オンショア', reading: 'おんしょあ', description: '海から陸へ吹く風。波面を乱してグチャグチャにする。サーフィンには不向き。' },
      { term: 'サイドオフ', reading: 'さいどおふ', description: '横から吹く風でやや沖向き成分あり。オフショアほどではないが悪くない。' },
      { term: 'サイドオン', reading: 'さいどおん', description: '横から吹く風で岸向き成分あり。波面が少し乱れる。' },
      { term: '無風', reading: 'むふう', description: '風速2m/s以下。海面が鏡のようになめらかになる最高の状態（グラッシー）。' },
      { term: 'グラッシー', reading: 'ぐらっしー', description: '無風で海面が鏡のように穏やかな状態。波のフェイスがきれいで乗りやすい。' },
      { term: '面ツル', reading: 'めんつる', description: 'グラッシーと同じ意味。波の面がツルツルになった状態。' },
    ],
  },
  {
    id: 'tide',
    label: '潮',
    terms: [
      { term: '満潮', reading: 'まんちょう', description: '潮位が最も高い状態。波が崩れにくくなりやすい。' },
      { term: '干潮', reading: 'かんちょう', description: '潮位が最も低い状態。波が速くワイドになりやすい。湘南は特に影響が出やすい。' },
      { term: '上げ潮', reading: 'あげしお', description: '干潮から満潮に向かって潮位が上がっている状態。波が入りやすくなる傾向。' },
      { term: '引き潮', reading: 'ひきしお', description: '満潮から干潮に向かって潮位が下がっている状態。' },
      { term: 'ミドルタイド', reading: 'みどるたいど', description: '干潮と満潮の中間の潮位。潮が最も動いている時間帯で波が立ちやすい。' },
      { term: '大潮', reading: 'おおしお', description: '満潮と干潮の差が大きい時期。新月・満月の前後。波への影響が大きい。' },
      { term: '小潮', reading: 'こしお', description: '干満の差が小さい時期。潮の動きが少なく波も穏やか。' },
      { term: '潮位', reading: 'ちょうい', description: '海面の高さ（cm）。S/Wでは横浜の観測データをリアルタイムで使用。' },
    ],
  },
  {
    id: 'board',
    label: 'ボード',
    terms: [
      { term: 'ロング', reading: 'ろんぐ', description: '9フィート以上の長いボード。浮力が大きく小さい波でも乗れる。初心者・トロい波向き。' },
      { term: 'ミッドレングス', reading: 'みっどれんぐす', description: '7〜8フィート程度の中間サイズ。湘南のトロい波に最も合いやすい。' },
      { term: 'ショート', reading: 'しょーと', description: '6フィート前後の短いボード。機動性が高いが波のパワーが必要。中上級者向き。' },
      { term: '浮力', reading: 'ふりょく', description: 'ボードが水に浮く力。大きいほどテイクオフしやすく初心者向き。' },
      { term: 'テイクオフ', reading: 'ていくおふ', description: 'パドリングから立ち上がって波に乗る瞬間。サーフィンの基本動作。' },
      { term: 'パドリング', reading: 'ぱどりんぐ', description: 'ボードに伏せて手で水をかいて進むこと。サーフィンの体力の大半を使う。' },
      { term: 'リーシュ', reading: 'りーしゅ', description: 'ボードと足首をつなぐコード。ボードが流されないようにする安全装備。' },
      { term: 'ワックス', reading: 'わっくす', description: 'ボードの上に塗る滑り止め。水温に合わせた硬さのものを選ぶ。' },
    ],
  },
  {
    id: 'manner',
    label: 'マナー・ルール',
    terms: [
      { term: '前乗り（ドロップイン）', reading: 'まえのり', description: '優先権のあるサーファーが乗っている波に割り込むこと。最も基本的なNGマナー。' },
      { term: '優先権', reading: 'ゆうせんけん', description: 'ピークに最も近い場所でテイクオフしたサーファーがその波を乗る権利を持つ。' },
      { term: 'ローカル', reading: 'ろーかる', description: 'そのポイントを日常的に使っているサーファー。敬意を持って接することが大切。' },
      { term: 'カレント', reading: 'かれんと', description: '海の流れ。特に離岸流は岸と平行に泳いで脱出する。' },
      { term: '離岸流', reading: 'りがんりゅう', description: '岸から沖へ向かう強い流れ。白波のない黒っぽい筋が目印。逆らわず横に泳いで脱出。' },
      { term: 'セッション', reading: 'せっしょん', description: 'サーフィンをする1回の海入り時間。' },
      { term: 'スープ', reading: 'すーぷ', description: '波が崩れた後の白い泡の部分。初心者はここで練習することが多い。' },
    ],
  },
]
