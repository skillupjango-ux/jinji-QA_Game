// 「辞典」の画面：話題のまとめを一覧にして、ジャンルと「大学に関係あり」で絞り込む。
// ジャンルタブはもう一度押すと解除され、全部のジャンルに戻る。

const 話題一覧の場所 = document.getElementById("話題一覧");
const 件数の場所 = document.getElementById("件数");

let まとめ全部 = [];
let 選んだジャンル = null;   // null のときは全ジャンル
let 大学だけ見る = false;

画面を作る();

async function 画面を作る() {
  try {
    まとめ全部 = await まとめ一覧を読む();
    絞り込みを思い出す();
    ボタンを押せるようにする();
    一覧を出し直す();
  } catch (エラー) {
    失敗を伝える(話題一覧の場所, エラー);
  }
}

function ボタンを押せるようにする() {
  document.querySelectorAll(".genre-tabs button").forEach(function (ボタン) {
    ボタン.addEventListener("click", function () {
      const ジャンル = ボタン.textContent;
      // 選んでいるものをもう一度押したら、絞り込みを解除する
      選んだジャンル = (選んだジャンル === ジャンル) ? null : ジャンル;
      一覧を出し直す();
    });
  });

  document.querySelector(".filter-univ").addEventListener("click", function () {
    大学だけ見る = !大学だけ見る;
    一覧を出し直す();
  });
}

// 「まとめ」を読んで戻ってきたときに、絞り込みが解除されていると探し直しになる。
// そこで、ブラウザのタブを閉じるまでのあいだだけ、絞り込みを覚えておく。
function 絞り込みを覚える() {
  sessionStorage.setItem("辞典の絞り込み", JSON.stringify({
    ジャンル: 選んだジャンル,
    大学だけ: 大学だけ見る
  }));
}

function 絞り込みを思い出す() {
  const 覚えていたもの = sessionStorage.getItem("辞典の絞り込み");
  if (覚えていたもの === null) {
    return;
  }
  const 中身 = JSON.parse(覚えていたもの);
  選んだジャンル = 中身.ジャンル;
  大学だけ見る = 中身.大学だけ === true;
}

function 一覧を出し直す() {
  押されているボタンに印を付ける();
  絞り込みを覚える();

  const 絞った一覧 = まとめ全部.filter(function (まとめ) {
    if (選んだジャンル !== null && まとめ.ジャンル !== 選んだジャンル) {
      return false;
    }
    if (大学だけ見る && !まとめ.大学に関係あり) {
      return false;
    }
    return true;
  });

  件数の場所.textContent = 絞り込みの説明() + "　" + 絞った一覧.length + "件";

  話題一覧の場所.textContent = "";
  if (絞った一覧.length === 0) {
    話題一覧の場所.appendChild(要素("li", "empty", "この条件に合う話題はまだありません。"));
    return;
  }
  絞った一覧.forEach(function (まとめ) {
    話題一覧の場所.appendChild(行を作る(まとめ));
  });
}

function 絞り込みの説明() {
  const 条件 = [];
  if (選んだジャンル !== null) {
    条件.push(選んだジャンル);
  }
  if (大学だけ見る) {
    条件.push("大学に関係あり");
  }
  return 条件.length === 0 ? "すべての話題" : 条件.join(" ＋ ");
}

// 押されているボタンは、色を反転させて「いま効いている」と分かるようにする
function 押されているボタンに印を付ける() {
  document.querySelectorAll(".genre-tabs button").forEach(function (ボタン) {
    const 選ばれている = ボタン.textContent === 選んだジャンル;
    ボタン.className = 選ばれている ? "selected" : "";
    ボタン.setAttribute("aria-pressed", 選ばれている ? "true" : "false");
  });

  const 絞り込みボタン = document.querySelector(".filter-univ");
  絞り込みボタン.className = 大学だけ見る ? "filter-univ selected" : "filter-univ";
  絞り込みボタン.setAttribute("aria-pressed", 大学だけ見る ? "true" : "false");
}

// 話題1件ぶんの行を作る。
function 行を作る(まとめ) {
  const 行 = 要素("li", "topic-row");

  const リンク = 要素("a", null, まとめ.話題名);
  リンク.href = "topic.html?id=" + encodeURIComponent(まとめ.id);
  行.appendChild(リンク);

  const 説明 = 要素("p", "row-meta");
  説明.appendChild(document.createTextNode(
    "最終更新 " + 日付を読みやすく(まとめ.最終更新) + " ／ " + まとめ.収録件数 + "件"
  ));
  if (まとめ.大学に関係あり) {
    説明.appendChild(document.createTextNode(" ／ "));
    説明.appendChild(要素("span", "univ-mark", "大学に関係あり"));
  }
  行.appendChild(説明);

  return 行;
}
