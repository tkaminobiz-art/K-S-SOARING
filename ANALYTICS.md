# Google 広告コンバージョン計測

実装日: 2026-07-21

Google 広告アカウント `AW-18262130937` のタグを `index.html` に直接設置している。

- 外部Googleタグの読込みは `www.sokujitu-kaishu.com` / `sokujitu-kaishu.com` の本番ドメインだけで有効。
- localhostは `adsdebug=1` を明示したQA時だけ外部タグを読み込み、Vercelなどのプレビュー環境では `dataLayer` のイベント記録だけを行う。本番広告データへテスト閲覧・クリックを混入させない。

| 内部イベント名 | Google 広告の送信先 | 発火条件 | 発火しない条件 | 重複防止 |
| --- | --- | --- | --- | --- |
| `line_click` | `AW-18262130937/NYplCJLBxc8cEPmBiIRE` | `https://lin.ee/Uze6YTx` へのLINE導線をクリック | 電話・ページ内リンク・表示だけ | 1操作につき1送信。1.5秒以内のダブルタップは抑止し、リンク遷移は妨げない。 |
| `lp_30s_engaged` | `AW-18262130937/01NXCOnXws8cEPmBiIRE` | 表示中の閲覧時間が累計30秒 | 非表示タブの時間、30秒未満の離脱 | `sessionStorage` により同一タブのセッション中は1回だけ。 |

## `/roulette/` の広告流入

- `/roulette/` は同一オリジンのLP本体をiframeで表示する。GoogleタグはLP本体側で1回だけ読み込み、二重設置しない。
- 外側URLの `gclid` / `gbraid` / `wbraid` / UTMなどのクエリをLP本体へ引き継ぎ、`roulette=1` を強制する。
- LINEクリック時はルーレット当選画面を含む全LINE導線で `line_click` を送る。`target="_blank"` の直接リンクなので、広告処理の成否がLINE遷移を妨げない。
- QAではGoogleの計測リクエストを送信前に遮断し、同一イベントIDを持つ複数の輸送リクエストを「論理イベント1件」として判定する。

## データと同意

- 送信するのは Google 広告のコンバージョンIDのみで、氏名・電話番号・メールアドレス・LINE本文などの個人情報はページから送らない。
- このLPには同意バナー／CMPがない。EEA・英国・スイスなどで配信する場合は、公開前に同意管理と Google Consent Mode v2 の設計・導入が必要。

## 確認項目

1. Google Tag Assistant で `AW-18262130937` のGoogleタグがページ読み込み時に検出されること。
2. いずれかのLINEボタンをクリックし、`AW-18262130937/NYplCJLBxc8cEPmBiIRE` の conversion が1回送信されること。
3. 新しいセッションでページを開いて表示状態のまま30秒待ち、`AW-18262130937/01NXCOnXws8cEPmBiIRE` の conversion が1回送信されること。
4. 30秒より前に別タブへ移動した時間を含めず、同じタブを再読み込みしても30秒コンバージョンが重複しないこと。
5. `/roulette/?gclid=TEST...` のクリックIDがiframe本体へ引き継がれ、ページビューとコンバージョンの送信URLに同じ `gclid` が含まれること。

最新の自動QA結果: `output/analytics-roulette-flow-qa.json`
