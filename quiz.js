// 「問題」の画面：4択を解く。
//   出題 → 選択肢を押す → 正誤と解説 → 次の問題へ → …最後の問題のあとは結果
//
// 3つの出し方がある。
//   今日の問題 … その日の3問。はじめて解いたときだけ、ポイントと連続日数が増える
//   話題の問題 … まとめの画面から来たとき（住所の末尾が ?topic=…）。その話題の問題だけを出す
//   おまけ     … 結果のあとの「もう1問やる」。過去の問題から1問ずつ出す
// 2回目以降の今日の問題・話題の問題・おまけは「復習」で、ポイントと連続日数は変わらない。

const 本体 = document.querySelector("main");
const 知らせの場所 = document.getElementById("出題の知らせ");
const 出題の場所 = document.getElementById("出題");
const 解説の場所 = document.getElementById("正誤と解説");
const 結果の場所 = document.getElementById("結果");

const 話題のid = new URLSearchParams(location.search).get("topic");

// 画面が覚えておくこと
let 記録 = null;          // 学習記録（レベルや連続日数）
let 出題した日 = "";       // 今日の問題が何日の分か
let ひとつ前の日 = null;   // その前に問題が出た日（連続日数を数えるのに使う）
let 出題リスト = [];       // 出す問題を、出す順に並べたもの
let いまの番号 = 0;        // 何問目を出しているか（0から数える）
let 正解数 = 0;
let 正解したジャンル = [];
let 復習 = false;          // true のあいだは、ポイントと連続日数を変えない
let おまけ = false;        // 「もう1問やる」で出している問題か
let 話題 = null;           // 話題の問題を出しているときの、その話題のまとめ
let 出した問題文 = [];     // この画面でもう出した問題（おまけで同じ問題を出さないため）
let 途中経過の目印 = "";   // どの出題の途中経過かを見分けるための名前

画面を作る();

async function 画面を作る() {
  try {
    記録 = await 学習記録を読む();

    if (話題のid) {
      await 話題の問題を用意する();
    } else {
      await 今日の問題を用意する();
    }
    if (出題リスト.length === 0) {
      return;   // 出す問題が無いときは、用意する側が案内を出している
    }

    出した問題文 = 出題リスト.map(function (問題) {
      return 問題.問題文;
    });

    見出しを作る();
    途中経過を思い出す();

    if (いまの番号 >= 出題リスト.length) {
      結果を出す();   // 最後の問題に答えたあとで、別の画面を見て戻ってきたとき
    } else {
      出題する();
    }
  } catch (エラー) {
    失敗を伝える(本体, エラー);
  }
}

async function 今日の問題を用意する() {
  const その日 = await その日のデータを読む();
  出題した日 = その日.日付;
  ひとつ前の日 = その日.ひとつ前の日付;
  出題リスト = 出題順に並べる(その日.問題);
  途中経過の目印 = "今日:" + 出題した日;

  // もう解き終わっている日の分は、復習として出す
  if (記録.最後に解いた日 === 出題した日) {
    復習 = true;
    知らせる("今日の分は解き終わっています。復習として、もう一度解けます（ポイントと連続日数は変わりません）。");
  }
}

async function 話題の問題を用意する() {
  const まとめ一覧 = await まとめ一覧を読む();
  話題 = まとめ一覧.find(function (件) {
    return 件.id === 話題のid;
  }) || null;

  出題リスト = 話題 ? 出題順に並べる(await 話題の問題を集める(話題)) : [];
  途中経過の目印 = "話題:" + 話題のid;
  復習 = true;

  if (出題リスト.length === 0) {
    見出しを作る();
    出題の場所.textContent = "";
    出題の場所.appendChild(要素("p", "question", "この話題の問題は、まだありません。"));
    出題の場所.appendChild(リンクの行("今日の問題を解く", "quiz.html", true));
    return;
  }
  知らせる("「" + 話題.話題名 + "」の問題です。復習なので、ポイントと連続日数は変わりません。");
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

function 知らせる(文字) {
  知らせの場所.textContent = 文字;
  知らせの場所.className = "mode-note";
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

// --- 途中経過 -----------------------------------------------------------
// 解いている途中で「まとめを見る」などに移っても、戻ったときに続きから解けるようにする。
// ブラウザのタブを閉じるまでのあいだだけ覚えておく。

function 途中経過を覚える() {
  if (おまけ) {
    return;   // おまけは1問ずつなので、覚えておくものが無い
  }
  sessionStorage.setItem("問題の途中経過", JSON.stringify({
    目印: 途中経過の目印,
    次の番号: いまの番号 + 1,
    正解数: 正解数,
    正解したジャンル: 正解したジャンル,
    間違えた問題: 記録.間違えた問題
  }));
}

function 途中経過を思い出す() {
  const 覚えていたもの = sessionStorage.getItem("問題の途中経過");
  if (覚えていたもの === null) {
    return;
  }
  const 中身 = JSON.parse(覚えていたもの);
  if (中身.目印 !== 途中経過の目印) {
    return;   // 別の出題の途中経過なので使わない
  }
  いまの番号 = 中身.次の番号;
  正解数 = 中身.正解数;
  正解したジャンル = 中身.正解したジャンル;
  記録.間違えた問題 = 中身.間違えた問題;
}

function 途中経過を消す() {
  sessionStorage.removeItem("問題の途中経過");
}

// --- 出題 ---------------------------------------------------------------

function 出題する() {
  const 問題 = 出題リスト[いまの番号];

  解説の場所.className = "block hidden";
  結果の場所.className = "block hidden";
  出題の場所.className = "block";
  出題の場所.textContent = "";

  出題の場所.appendChild(要素("p", "progress", おまけ
    ? "おまけの1問（" + 日付を読みやすく(問題.出た日) + "の問題）"
    : (いまの番号 + 1) + "問目 ／ " + 出題リスト.length + "問"));

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

  途中経過を覚える();
  選んだ後の選択肢にする(選んだ番号, 問題.正解);
  解説を出す(問題, 当たり);

  if (おまけ) {
    記録を保存して知らせる(解説の場所);   // おまけは結果の画面が無いので、ここで保存する
  }
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

  // 次に押すボタン。いちばん押してほしいもの（主役）を先頭に置いて塗りつぶす
  const ボタンの列 = 要素("div", "actions");
  if (おまけ) {
    ボタンの列.appendChild(ボタンの行("もう1問やる", もう1問やる, true));
    ボタンの列.appendChild(リンクの行("今日の画面へ", "index.html"));
  } else {
    const 最後の問題 = いまの番号 === 出題リスト.length - 1;
    ボタンの列.appendChild(ボタンの行(最後の問題 ? "結果を見る" : "次の問題へ", function () {
      if (最後の問題) {
        結果を出す();
      } else {
        いまの番号 = いまの番号 + 1;
        出題する();
      }
    }, true));
  }
  // まとめがある話題では、まとめへのリンクも出す
  if (問題.まとめid) {
    ボタンの列.appendChild(リンクの行("まとめを見る",
      "topic.html?id=" + encodeURIComponent(問題.まとめid)));
  }
  解説の場所.appendChild(ボタンの列);

  解説の場所.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- 結果 ---------------------------------------------------------------

function 結果を出す() {
  途中経過を消す();
  const 獲得ポイント = 復習 ? 0 : 正解数;
  if (!復習) {
    記録を書き換える(獲得ポイント);
  }

  知らせの場所.className = "mode-note hidden";
  出題の場所.className = "block hidden";
  解説の場所.className = "block hidden";
  結果の場所.className = "block";
  結果の場所.textContent = "";

  結果の場所.appendChild(要素("p", "result-score",
    出題リスト.length + "問中 " + 正解数 + "問 正解"));

  if (復習) {
    結果の場所.appendChild(要素("p", "screen-meta",
      "復習なので、ポイントと連続日数は変わりません。"));
  } else {
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
  }

  結果の場所.appendChild(要素("h2", null, "ジャンル別レベル"));
  const 並び = 要素("ul", "levels");
  Object.keys(記録.ジャンル別レベル).forEach(function (ジャンル) {
    並び.appendChild(要素("li", null, ジャンル + "　レベル " + 記録.ジャンル別レベル[ジャンル]));
  });
  結果の場所.appendChild(並び);

  // どのジャンルも同じレベルのときは、手薄なジャンルが無いので何も出さない
  const 手薄 = 手薄なジャンル();
  if (手薄 !== null) {
    結果の場所.appendChild(要素("p", "hint", 手薄 + "が手薄です"));
  }

  if (記録.間違えた問題.length > 0) {
    結果の場所.appendChild(要素("p", "screen-meta",
      "間違えた " + 記録.間違えた問題.length + "問は、次に解くとき先に出ます。"));
  }

  const ボタンの列 = 要素("div", "actions");
  ボタンの列.appendChild(ボタンの行("もう1問やる", もう1問やる, true));
  if (話題) {
    ボタンの列.appendChild(リンクの行("まとめにもどる", "topic.html?id=" + encodeURIComponent(話題.id)));
  }
  ボタンの列.appendChild(リンクの行("辞典で読む", "dict.html"));
  結果の場所.appendChild(ボタンの列);

  // 今日の分を解き終えたので、ここから先（おまけ）は復習になる
  復習 = true;

  見出しを作る();
  window.scrollTo(0, 0);
  記録を保存して知らせる(結果の場所);
}

// 学習記録を保存して、その結果を1行で知らせる。途中でやめた分は記録されない。
async function 記録を保存して知らせる(場所) {
  const 保存の知らせ = 要素("p", "screen-meta", "記録を保存しています…");
  場所.appendChild(保存の知らせ);
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

  // 連続日数：前の回を飛ばしていたら、連続が切れたとみなして1からやり直す。
  const 前の回も解いた = 記録.最後に解いた日 === ひとつ前の日;
  const 前の回が無い = ひとつ前の日 === null || ひとつ前の日 === undefined;
  記録.連続日数 = (前の回も解いた || 前の回が無い) ? 記録.連続日数 + 1 : 1;
  記録.最後に解いた日 = 出題した日;
}

// レベルがいちばん低いジャンルを選ぶ。どれも同じレベルなら null。
function 手薄なジャンル() {
  const ジャンル一覧 = Object.keys(記録.ジャンル別レベル);
  const レベルたち = ジャンル一覧.map(function (ジャンル) {
    return 記録.ジャンル別レベル[ジャンル];
  });
  const いちばん低い = Math.min.apply(null, レベルたち);
  if (いちばん低い === Math.max.apply(null, レベルたち)) {
    return null;
  }
  return ジャンル一覧[レベルたち.indexOf(いちばん低い)];
}

// --- もう1問やる（おまけ） ----------------------------------------------

async function もう1問やる() {
  let 問題 = null;
  try {
    問題 = await 過去の問題を1つ選ぶ(出した問題文);
  } catch (エラー) {
    問題 = null;
  }

  if (問題 === null) {
    // 出せる問題が残っていないときは、ボタンの代わりにそのことを伝える
    const 今出ている場所 = 結果の場所.className.includes("hidden") ? 解説の場所 : 結果の場所;
    今出ている場所.querySelectorAll(".actions button").forEach(function (ボタン) {
      ボタン.disabled = true;
    });
    今出ている場所.appendChild(要素("p", "screen-meta",
      "出せる問題は、これで全部です。また明日、新しい問題が届きます。"));
    return;
  }

  おまけ = true;
  復習 = true;
  出した問題文.push(問題.問題文);
  出題リスト = [問題];
  いまの番号 = 0;
  正解数 = 0;
  正解したジャンル = [];
  知らせる("過去の問題からの、おまけの1問です。ポイントと連続日数は変わりません。");
  出題する();
}

// --- 小さな部品 ---------------------------------------------------------
// 3つ目に true を渡すと、いちばん押してほしいボタン（主役）として塗りつぶす。

function リンクの行(文字, 行き先, 主役) {
  const 行 = 要素("p", 主役 ? "card-action primary" : "card-action");
  const リンク = 要素("a", null, 文字);
  リンク.href = 行き先;
  行.appendChild(リンク);
  return 行;
}

function ボタンの行(文字, 押したとき, 主役) {
  const 行 = 要素("p", 主役 ? "card-action primary" : "card-action");
  const ボタン = 要素("button", null, 文字);
  ボタン.type = "button";
  ボタン.addEventListener("click", 押したとき);
  行.appendChild(ボタン);
  return 行;
}
