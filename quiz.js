// 「問題」の画面：4択を3問解く。
//   出題 → 選択肢を押す → 正誤と解説 → 次の問題へ → …最後の問題のあとは結果
// 結果を出した時点で、学習記録をJSONファイルに書き戻す。

const 本体 = document.querySelector("main");
const 出題の場所 = document.getElementById("出題");
const 解説の場所 = document.getElementById("正誤と解説");
const 結果の場所 = document.getElementById("結果");

// 画面が覚えておくこと
let 記録 = null;          // 学習記録（レベルや連続日数）
let 出題した日 = "";       // 出している問題が何日の分か
let ひとつ前の日 = null;   // その前に問題が出た日（連続日数を数えるのに使う）
let 出題リスト = [];       // 今日出す問題を、出す順に並べたもの
let いまの番号 = 0;        // 何問目を出しているか（0から数える）
let 正解数 = 0;
let 正解したジャンル = [];

画面を作る();

async function 画面を作る() {
  try {
    const その日 = await その日のデータを読む();
    記録 = await 学習記録を読む();

    出題した日 = その日.日付;
    ひとつ前の日 = その日.ひとつ前の日付;
    出題リスト = 出題順に並べる(その日.問題);

    見出しを作る();
    出題する();
  } catch (エラー) {
    失敗を伝える(本体, エラー);
  }
}

// 前に間違えた問題を先に出す（仕様書「やること（MVP）」より）
function 出題順に並べる(問題たち) {
  const 間違えたことがある = function (問題) {
    return 記録.間違えた問題.includes(問題.問題文);
  };
  const 先に出す = 問題たち.filter(間違えたことがある);
  const 後に出す = 問題たち.filter(function (問題) {
    return !間違えたことがある(問題);
  });
  return 先に出す.concat(後に出す);
}

// 画面の上の紺の帯（レベルと連続日数）
function 見出しを作る() {
  document.getElementById("見出しの情報").textContent =
    "レベル " + 記録.レベル +
    " ／ 累計 " + 記録.累計ポイント.toLocaleString() + " ポイント" +
    " ／ " + 記録.連続日数 + "日連続";

  // バーの長さは記録の数字から決まるので、ここで指定する
  document.getElementById("レベルのバー").style.width = 進み具合() + "%";

  document.getElementById("次のレベルまで").textContent =
    "次のレベルまで あと " + 記録.次のレベルまで + " ポイント";
}

function 進み具合() {
  return Math.round((記録.レベルの幅 - 記録.次のレベルまで) / 記録.レベルの幅 * 100);
}

// --- 出題 ---------------------------------------------------------------

function 出題する() {
  const 問題 = 出題リスト[いまの番号];

  解説の場所.className = "block hidden";
  結果の場所.className = "block hidden";
  出題の場所.className = "block";
  出題の場所.textContent = "";

  出題の場所.appendChild(要素("p", "progress",
    (いまの番号 + 1) + "問目 ／ " + 出題リスト.length + "問"));

  if (記録.間違えた問題.includes(問題.問題文)) {
    出題の場所.appendChild(要素("p", "retry-mark", "前に間違えた問題です"));
  }

  出題の場所.appendChild(要素("p", "question", 問題.問題文));

  const 選択肢の列 = 要素("ul", "choices");
  問題.選択肢.forEach(function (選択肢, 番号) {
    const 行 = 要素("li");
    const ボタン = 要素("button", null, 選択肢);
    ボタン.type = "button";
    ボタン.addEventListener("click", function () {
      答える(番号);
    });
    行.appendChild(ボタン);
    選択肢の列.appendChild(行);
  });
  出題の場所.appendChild(選択肢の列);

  window.scrollTo(0, 0);
}

// --- 答えたとき ---------------------------------------------------------

function 答える(選んだ番号) {
  const 問題 = 出題リスト[いまの番号];
  const 当たり = 選んだ番号 === 問題.正解;

  if (当たり) {
    正解数 = 正解数 + 1;
    正解したジャンル.push(問題.ジャンル);
    // 解けるようになったので、間違えた問題の一覧から外す
    記録.間違えた問題 = 記録.間違えた問題.filter(function (問題文) {
      return 問題文 !== 問題.問題文;
    });
  } else if (!記録.間違えた問題.includes(問題.問題文)) {
    // 間違えた問題は、次に優先して出すために覚えておく
    記録.間違えた問題.push(問題.問題文);
  }

  選んだ後の選択肢にする(選んだ番号, 問題.正解);
  解説を出す(問題, 当たり);
}

// 押した後は、正解と自分の答えに色を付けて、押せないようにする
function 選んだ後の選択肢にする(選んだ番号, 正解の番号) {
  const ボタンたち = 出題の場所.querySelectorAll(".choices button");
  ボタンたち.forEach(function (ボタン, 番号) {
    ボタン.disabled = true;
    if (番号 === 正解の番号) {
      ボタン.className = "correct";
    } else if (番号 === 選んだ番号) {
      ボタン.className = "wrong";
    }
  });
}

function 解説を出す(問題, 当たり) {
  解説の場所.className = "block";
  解説の場所.textContent = "";

  解説の場所.appendChild(要素("p", 当たり ? "judge" : "judge wrong", 当たり ? "正解" : "不正解"));
  if (!当たり) {
    解説の場所.appendChild(要素("p", "correct-answer",
      "正解は「" + 問題.選択肢[問題.正解] + "」です。"));
  }
  解説の場所.appendChild(文章の段落("explain", 問題.解説));
  解説の場所.appendChild(出典の行(問題.出典));

  // まとめがまだ無い話題では、ボタンを出さない
  if (問題.まとめid) {
    解説の場所.appendChild(リンクの行("まとめを見る",
      "topic.html?id=" + encodeURIComponent(問題.まとめid)));
  }

  const 最後の問題 = いまの番号 === 出題リスト.length - 1;
  解説の場所.appendChild(ボタンの行(最後の問題 ? "結果を見る" : "次の問題へ", function () {
    if (最後の問題) {
      結果を出す();
    } else {
      いまの番号 = いまの番号 + 1;
      出題する();
    }
  }));

  解説の場所.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- 結果 ---------------------------------------------------------------

async function 結果を出す() {
  const 獲得ポイント = 正解数;
  記録を書き換える(獲得ポイント);

  出題の場所.className = "block hidden";
  解説の場所.className = "block hidden";
  結果の場所.className = "block";
  結果の場所.textContent = "";

  結果の場所.appendChild(要素("p", "result-score",
    出題リスト.length + "問中 " + 正解数 + "問 正解"));

  結果の場所.appendChild(要素("p", "screen-meta",
    "獲得ポイント +" + 獲得ポイント +
    " ／ 累計 " + 記録.累計ポイント.toLocaleString() + " ポイント"));

  const バー = 要素("div", "bar");
  const 中身 = 要素("div", "bar-fill");
  中身.style.width = 進み具合() + "%";
  バー.appendChild(中身);
  結果の場所.appendChild(バー);

  結果の場所.appendChild(要素("p", "screen-meta",
    "連続日数が " + 記録.連続日数 + "日 になりました"));

  結果の場所.appendChild(要素("h2", null, "ジャンル別レベル"));
  const 並び = 要素("ul", "levels");
  Object.keys(記録.ジャンル別レベル).forEach(function (ジャンル) {
    並び.appendChild(要素("li", null, ジャンル + "　レベル " + 記録.ジャンル別レベル[ジャンル]));
  });
  結果の場所.appendChild(並び);

  結果の場所.appendChild(要素("p", "hint", 手薄なジャンル() + "が手薄です"));

  if (記録.間違えた問題.length > 0) {
    結果の場所.appendChild(要素("p", "screen-meta",
      "間違えた " + 記録.間違えた問題.length + "問は、次に解くとき先に出ます。"));
  }

  結果の場所.appendChild(リンクの行("辞典で読む", "dict.html"));
  結果の場所.appendChild(ボタンの行("もう1問やる", function () {
    // タスク10で、その場で追加の1問を出せるようにする
  }));

  見出しを作る();
  window.scrollTo(0, 0);

  // ここで初めてファイルに書き戻す。途中でやめた分は記録されない。
  const 保存の知らせ = 要素("p", "screen-meta", "記録を保存しています…");
  結果の場所.appendChild(保存の知らせ);
  try {
    await 学習記録を保存する(記録);
    保存の知らせ.textContent = "記録を保存しました";
  } catch (エラー) {
    保存の知らせ.className = "error";
    保存の知らせ.textContent = エラー.message;
  }
}

// 正解した分だけポイントとレベルを上げる。
function 記録を書き換える(獲得ポイント) {
  記録.累計ポイント = 記録.累計ポイント + 獲得ポイント;
  記録.次のレベルまで = 記録.次のレベルまで - 獲得ポイント;

  while (記録.次のレベルまで <= 0) {
    記録.レベル = 記録.レベル + 1;
    記録.次のレベルまで = 記録.次のレベルまで + 記録.レベルの幅;
  }

  // 正解したジャンルのレベルも上げる
  正解したジャンル.forEach(function (ジャンル) {
    if (記録.ジャンル別レベル[ジャンル] !== undefined) {
      記録.ジャンル別レベル[ジャンル] = 記録.ジャンル別レベル[ジャンル] + 1;
    }
  });

  // 連続日数：同じ日の分を何度解いても増えない。
  // 前の回を飛ばしていたら、連続が切れたとみなして1からやり直す。
  if (記録.最後に解いた日 !== 出題した日) {
    const 前の回も解いた = 記録.最後に解いた日 === ひとつ前の日;
    const 前の回が無い = ひとつ前の日 === null || ひとつ前の日 === undefined;
    記録.連続日数 = (前の回も解いた || 前の回が無い) ? 記録.連続日数 + 1 : 1;
    記録.最後に解いた日 = 出題した日;
  }
}

// レベルがいちばん低いジャンルを選ぶ
function 手薄なジャンル() {
  const ジャンル一覧 = Object.keys(記録.ジャンル別レベル);
  return ジャンル一覧.reduce(function (低い方, ジャンル) {
    return 記録.ジャンル別レベル[ジャンル] < 記録.ジャンル別レベル[低い方] ? ジャンル : 低い方;
  }, ジャンル一覧[0]);
}

// --- 小さな部品 ---------------------------------------------------------

function リンクの行(文字, 行き先) {
  const 行 = 要素("p", "card-action");
  const リンク = 要素("a", null, 文字);
  リンク.href = 行き先;
  行.appendChild(リンク);
  return 行;
}

function ボタンの行(文字, 押したとき) {
  const 行 = 要素("p", "card-action");
  const ボタン = 要素("button", null, 文字);
  ボタン.type = "button";
  ボタン.addEventListener("click", 押したとき);
  行.appendChild(ボタン);
  return 行;
}
