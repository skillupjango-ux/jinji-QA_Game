// どの画面からも使う、小さな道具をまとめたファイル。
// 画面ごとの処理は index.js / quiz.js / dict.js / topic.js に分けてある。

// アプリの名前と、ひとこと。名前を変えたいときは、ここを直すだけで全部の画面に効く。
const アプリ名 = "人事の朝刊";
const アプリのひとこと = "読んで5分、解いて3問";

// 学習記録をどこに置くか。
//   "ファイル" … 自分のPCで動かすとき。data/users/自分.json に保存する（サーバーが書き込む）
//   "ブラウザ" … 公開したとき。見ている人のブラウザの中に保存する（人ごとに別々になる）
// 公開用のフォルダを作るときに、publish.py がこの1行を "ブラウザ" に書き換える。
const 記録の置き場 = "ブラウザ";

// 自分のPCで動かすときの、使う人の名前（ファイル名になる）
const 使う人 = "自分";

// はじめて開いた人の学習記録（公開したときに使う）
const はじめての記録 = {
  "使う人": "あなた",
  "レベル": 1,
  "累計ポイント": 0,
  "レベルの幅": 10,
  "次のレベルまで": 10,
  "連続日数": 0,
  "最後に解いた日": null,
  "ジャンル別レベル": { "労働": 1, "研修": 1, "採用": 1 },
  "間違えた問題": []
};

// JSONファイルを1つ読む。
// 住所は「いま開いているページから見た場所」で書く（先頭に / を付けない）。
// こうしておくと、自分のPCでも公開先でも同じ書き方で読める。
async function データを読む(パス) {
  const 返事 = await fetch(パス);
  if (!返事.ok) {
    throw new Error(パス + " が読めませんでした（" + 返事.status + "）");
  }
  return await 返事.json();
}

// その日の内容（全員共通）。いちばん新しい日の分を読む。
// まだ今日の分が作られていないときは、前の日の分が出る。
async function その日のデータを読む() {
  const 最新 = await データを読む("data/latest.json");
  const その日 = await データを読む("data/topics/" + 最新.日付 + ".json");
  その日.ひとつ前の日付 = 最新.ひとつ前の日付;   // 連続日数を数えるのに使う
  return その日;
}

// 話題のまとめ（全員共通）
function まとめ一覧を読む() {
  return データを読む("data/summaries.json");
}

// 学習記録（人ごと）を読む。
async function 学習記録を読む() {
  if (記録の置き場 === "ファイル") {
    return データを読む("data/users/" + encodeURIComponent(使う人) + ".json");
  }
  try {
    const 保存してあるもの = localStorage.getItem("学習記録");
    if (保存してあるもの !== null) {
      return JSON.parse(保存してあるもの);
    }
  } catch (エラー) {
    // ブラウザの設定で保存が使えないときは、はじめての記録で進める
  }
  return JSON.parse(JSON.stringify(はじめての記録));
}

// 学習記録（人ごと）を保存する。
async function 学習記録を保存する(記録) {
  if (記録の置き場 === "ファイル") {
    const 返事 = await fetch("api/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(記録)
    });
    if (!返事.ok) {
      throw new Error("学習記録を保存できませんでした（" + 返事.status + "）");
    }
    return;
  }
  try {
    localStorage.setItem("学習記録", JSON.stringify(記録));
  } catch (エラー) {
    throw new Error("このブラウザには記録を保存できませんでした（プライベートモードでは保存されません）");
  }
}

// タグ名とクラス名と文字から、画面の部品を1つ作る。
function 要素(タグ名, クラス名, 文字) {
  const 部品 = document.createElement(タグ名);
  if (クラス名) {
    部品.className = クラス名;
  }
  if (文字 !== undefined && 文字 !== null) {
    部品.textContent = 文字;
  }
  return 部品;
}

// 「出典：〇〇（官公庁）」の1行を作る。
function 出典の行(出典) {
  const 行 = 要素("p", "source");
  行.appendChild(document.createTextNode("出典："));
  const リンク = 要素("a", null, 出典.名前);
  リンク.href = 出典.url;
  行.appendChild(リンク);
  行.appendChild(document.createTextNode("（" + 出典.種類 + "）"));
  return 行;
}

// 複数行の文章を、改行で区切った1つの段落にする。
function 文章の段落(クラス名, 行たち) {
  const 段落 = 要素("p", クラス名);
  行たち.forEach(function (行, 番号) {
    if (番号 > 0) {
      段落.appendChild(document.createElement("br"));
    }
    段落.appendChild(document.createTextNode(行));
  });
  return 段落;
}

// "2026-11-10" を "2026年11月10日" にする。
function 日付を読みやすく(日付) {
  const 部分 = 日付.split("-");
  return Number(部分[0]) + "年" + Number(部分[1]) + "月" + Number(部分[2]) + "日";
}

// --- どの画面にも出す飾り（看板と、下のタブの絵） ---------------------------

// 絵（アイコン）の形。色や線の太さは style.css で決める。
const 看板の絵 =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path class="sun" d="M5 17a7 7 0 0 1 14 0z"/>' +
  '<path class="ray" d="M3 20h18M12 4v3M4.6 8.6l2 2M19.4 8.6l-2 2"/></svg>';

const タブの絵 = {
  "今日": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/>' +
          '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
  "問題": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/>' +
          '<path d="M8 12.5l2.8 2.8L16 9.5"/></svg>',
  "辞典": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/>' +
          '<path d="M5 17a3 3 0 0 1 3-3h10"/></svg>'
};

// ブラウザのタブに出る小さな絵。画像ファイルを置かずに、ここで形を書いている。
const タブに出る絵 = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<rect width="24" height="24" rx="6" fill="#1c3f6e"/>' +
  '<path d="M6 16.5a6 6 0 0 1 12 0z" fill="#f6b04a"/>' +
  '<path d="M4.5 19h15M12 5v2.5M6 9l1.6 1.6M18 9l-1.6 1.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>');

function 飾りを付ける() {
  // 1. 画面のいちばん上に、アプリ名の看板を出す
  const 看板 = 要素("div", "brand");
  const リンク = 要素("a", "brand-link");
  リンク.href = "index.html";
  const 絵 = 要素("span", "brand-mark");
  絵.innerHTML = 看板の絵;
  const 文字 = 要素("span", "brand-text");
  文字.appendChild(要素("span", "brand-name", アプリ名));
  文字.appendChild(要素("span", "brand-tagline", アプリのひとこと));
  リンク.appendChild(絵);
  リンク.appendChild(文字);
  看板.appendChild(リンク);
  document.body.prepend(看板);

  // 2. ブラウザのタブの名前と絵
  document.title = document.title + "｜" + アプリ名;
  const 絵の指定 = document.createElement("link");
  絵の指定.rel = "icon";
  絵の指定.href = タブに出る絵;
  document.head.appendChild(絵の指定);

  // 3. 下のタブに絵を付ける
  document.querySelectorAll(".tabs a, .tabs .tab-current").forEach(function (タブ) {
    const 名前 = タブ.textContent.trim();
    if (タブの絵[名前]) {
      タブ.textContent = "";
      const 絵の場所 = 要素("span", "tab-icon");
      絵の場所.innerHTML = タブの絵[名前];
      タブ.appendChild(絵の場所);
      タブ.appendChild(要素("span", "tab-label", 名前));
    }
  });
}

飾りを付ける();

// 読み込みに失敗したとき、何が起きたかを画面に出す。
function 失敗を伝える(場所, エラー) {
  場所.textContent = "";
  場所.appendChild(要素("p", "error", "データを読み込めませんでした。" + エラー.message));
  if (記録の置き場 === "ファイル") {
    場所.appendChild(要素("p", "error", "HTMLファイルを直接ひらくと動きません。起動.bat から起動して、http://127.0.0.1:8000 をひらいてください。"));
  } else {
    場所.appendChild(要素("p", "error", "少し時間をおいて、ページを読み込み直してください。"));
  }
}
