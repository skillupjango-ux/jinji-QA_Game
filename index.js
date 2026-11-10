// 「今日」の画面：その日のトピックを読み込んで、カードを並べる。

const 一覧の場所 = document.getElementById("トピック一覧");

// ジャンルごとの色を決めるための目印（色そのものは style.css に書く）
const ジャンルの目印 = { "労働": "g-labor", "研修": "g-training", "採用": "g-hiring" };

画面を作る();

async function 画面を作る() {
  try {
    const その日 = await その日のデータを読む();
    const 記録 = await 学習記録を読む();

    頭の部分を作る(その日, 記録);

    // 大学に関係あるものを上に並べる（仕様書の「画面一覧と遷移」より）
    const 並べたトピック = その日.トピック.slice().sort(function (前, 後) {
      return (後.大学に関係あり ? 1 : 0) - (前.大学に関係あり ? 1 : 0);
    });

    一覧の場所.textContent = "";
    並べたトピック.forEach(function (トピック) {
      一覧の場所.appendChild(カードを作る(トピック));
    });

    document.getElementById("問題へ進む").textContent =
      "今日の問題を解く（" + その日.問題.length + "問）";
  } catch (エラー) {
    失敗を伝える(一覧の場所, エラー);
  }
}

// 画面の頭：あいさつ、日付、きょうの数字（連続日数・レベル・読む量）
function 頭の部分を作る(その日, 記録) {
  document.getElementById("あいさつ").textContent = あいさつ();
  document.getElementById("今日の日付").textContent = 曜日つきの日付(その日.日付);

  const 数字の列 = document.getElementById("きょうの数字");
  数字の列.textContent = "";
  数字の列.appendChild(要素("li", "stat streak", 記録.連続日数 + "日連続"));
  数字の列.appendChild(要素("li", "stat", "レベル " + 記録.レベル));
  数字の列.appendChild(要素("li", "stat",
    "トピック" + その日.トピック.length + "件・問題" + その日.問題.length + "問"));

  // 出ているのが今日の分でないときは、そのことを知らせる
  if (その日.日付 !== 今日の日付()) {
    document.getElementById("古い分の知らせ").className = "hero-note";
  }
}

function あいさつ() {
  const 時 = new Date().getHours();
  if (時 >= 5 && 時 < 11) {
    return "おはようございます";
  }
  if (時 >= 11 && 時 < 18) {
    return "こんにちは";
  }
  return "おつかれさまです";
}

// "2026-11-11" を "11月11日（水）" にする。
function 曜日つきの日付(日付) {
  const 部分 = 日付.split("-").map(Number);
  const 曜日 = "日月火水木金土"[new Date(部分[0], 部分[1] - 1, 部分[2]).getDay()];
  return 部分[1] + "月" + 部分[2] + "日（" + 曜日 + "）";
}

// いまの日付を "2026-11-11" の形で返す。
function 今日の日付() {
  const 今 = new Date();
  const 二けた = function (数) {
    return String(数).padStart(2, "0");
  };
  return 今.getFullYear() + "-" + 二けた(今.getMonth() + 1) + "-" + 二けた(今.getDate());
}

// トピック1件ぶんのカードを作る。
function カードを作る(トピック) {
  const カード = 要素("article", "card");

  カード.appendChild(要素("h2", null, トピック.見出し));
  カード.appendChild(文章の段落("summary", トピック.要約));

  const 印の列 = 要素("ul", "tags");
  印の列.appendChild(要素("li", ジャンルの目印[トピック.ジャンル] || null, トピック.ジャンル));
  if (トピック.大学に関係あり) {
    印の列.appendChild(要素("li", "univ", "大学に関係あり"));
  }
  カード.appendChild(印の列);

  カード.appendChild(出典の行(トピック.出典));

  // まとめがまだ無い話題では、ボタンを出さない
  if (トピック.まとめid) {
    const ボタンの行 = 要素("p", "card-action");
    const リンク = 要素("a", null, "まとめを見る");
    リンク.href = "topic.html?id=" + encodeURIComponent(トピック.まとめid);
    ボタンの行.appendChild(リンク);
    カード.appendChild(ボタンの行);
  }

  return カード;
}
