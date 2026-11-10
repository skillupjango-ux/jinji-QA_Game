// 「今日」の画面：その日のトピックを読み込んで、カードを並べる。

const 一覧の場所 = document.getElementById("トピック一覧");

画面を作る();

async function 画面を作る() {
  try {
    const その日 = await その日のデータを読む();
    const 記録 = await 学習記録を読む();

    document.getElementById("見出しの情報").textContent =
      日付を読みやすく(その日.日付) + " ／ " + 記録.連続日数 + "日連続";

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

// トピック1件ぶんのカードを作る。
function カードを作る(トピック) {
  const カード = 要素("article", "card");

  カード.appendChild(要素("h2", null, トピック.見出し));
  カード.appendChild(文章の段落("summary", トピック.要約));

  const 印の列 = 要素("ul", "tags");
  印の列.appendChild(要素("li", null, トピック.ジャンル));
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
