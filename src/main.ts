import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"
// 物理エンジン
import * as b2 from "@akashic-extension/akashic-box2d"

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["toomo", "kiyomizu", "n_kou"]
	})
	let time = 60 // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 }

	/** 物体のオブジェクト */
	interface BodyObject {
		/** @param assetSrc 画像の名前。assetIdsに書かないと動かないよ */
		assetSrc: string
		/** @param sharpList 当たり判定の形状。 */
		sharpList: b2.Box2DWeb.Common.Math.b2Vec2[]
	}
	// 生成した物体の配列
	const bodyObjectList: b2.Box2DOptions.EBody[] = []

	scene.loaded.add(() => {
		// ここからゲーム内容を記述します

		// 物理エンジンの世界を生成する
		const worldOption = {
			gravity: [0, 9.8],
			scale: 50,
			sleep: true
		}
		const box = new b2.Box2D(worldOption)
		// 物理エンジンの世界を進める
		scene.update.add(() => {
			box.step(1 / g.game.fps)
		})

		// フォントの生成
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: g.FontFamily.Serif,
			size: 48
		})

		// スコア表示用のラベル
		const scoreLabel = new g.Label({
			scene: scene,
			text: "SCORE: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black"
		})
		scene.append(scoreLabel)

		// 残り時間表示用ラベル
		const timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			x: 0.7 * g.game.width
		})
		scene.append(timeLabel)

		// 地面
		const base = new g.FilledRect({
			scene: scene,
			width: g.game.width,
			height: 10,
			cssColor: "black",
			y: (300)
		})
		scene.append(base)
		const floorFixDef = box.createFixtureDef({
			density: 1.0, // 密度
			friction: 0.5, // 摩擦係数
			restitution: 0.3, // 反発係数
			shape: box.createRectShape(base.width, base.height) // 形状
		})
		const floorDef = box.createBodyDef({
			type: b2.BodyType.Static
		})
		const floorBody = box.createBody(base, floorDef, floorFixDef)

		// 物体生成
		const nKou: BodyObject = {
			assetSrc: "n_kou",
			sharpList: [
				box.vec2(25, -25),
				box.vec2(25, 25),
				box.vec2(-25, 25),
				box.vec2(-25, -25)
			]
		}
		const bodyList = [nKou]

		/** 触っていないオブジェクトが存在する場合はtrue
		 * （まだ上にあって落下していないときはtrue）
		 */
		let isNotTouchObjctExists = false

		/** 物体の生成関数。
		 * @param obj 当たり判定とか画像の名前とか
		 * @param xPos X座標。クリックしたときに取れるのでそれ
		 * @param yPos Y座標。クリックしたときに取れるのでそれ
		 */
		const createObject = (obj: BodyObject, xPos: number): b2.Box2DOptions.EBody => {
			isNotTouchObjctExists = true
			const entity = new g.Sprite({
				scene: scene,
				src: scene.assets[obj.assetSrc],
				width: (scene.assets[obj.assetSrc] as g.ImageAsset).width,
				height: (scene.assets[obj.assetSrc] as g.ImageAsset).height,
				x: xPos,
				y: getHighestPos(base.y) - 100
			})
			scene.append(entity)
			entity.modified()
			const entityFixDef = box.createFixtureDef({
				density: 1.0, // 密度
				friction: 0.5, // 摩擦係数
				restitution: 0.3, // 反発係数
				shape: box.createPolygonShape(obj.sharpList) // 形状
			})
			const entityDef = box.createBodyDef({
				type: b2.BodyType.Dynamic
			})
			const createBody = box.createBody(entity, entityDef, entityFixDef)
			// 押すまでオブジェクトを睡眠？停止状態にする。寝てる間はDynamicでも動かない
			// 睡眠状態を利用可能にする
			createBody.b2body.SetSleepingAllowed(true)
			// おやすみ
			createBody.b2body.SetAwake(false)
			// X座標取得。ドラッグでできるように
			scene.pointMoveCapture.add((event) => {
				createBody.entity.x += event.prevDelta.x
				// Sprite移動だけではだめなので
				createBody.b2body.SetPosition(box.vec2(createBody.entity.x + entity.width / 2, createBody.entity.y + entity.height / 2))
				createBody.entity.modified()
			})
			scene.pointUpCapture.add(() => {
				// おはようのオーディションして～かみｇ
				createBody.b2body.SetAwake(true)
				isNotTouchObjctExists = false
				// 落としたら移動できないようにイベント消す
				scene.pointMoveCapture.removeAll()
				scene.pointUpCapture.removeAll()
				bodyObjectList.push(createBody)
			})
			return createBody
		}
		// 画像生成。
		scene.setInterval(() => {
			if (!isNotTouchObjctExists) {
				const bodyObj = createObject(nKou, (g.game.width / 2))
			}
		}, 2 * 1000)

		// カメラ移動、スコアラベル、時間ラベル移動など
		const camera = new g.Camera2D({ game: g.game })
		g.game.focusingCamera = camera
		g.game.modified = true
		scene.update.add(() => {
			// 一番高いところにある物体のの座標
			const highest = getHighestPos(0)
			// 一番低いところにある物体のの座標。今回は受け皿
			const lowest = base.y
			console.log(`一番高い:${Math.round(highest)} / 一番低い:${Math.round(lowest)}`)
			// 絶対値計算
			let abs = Math.abs(lowest - highest)
			if (bodyObjectList.length === 0) {
				abs = 0
			}
			console.log(abs > g.game.height)
			if (abs > g.game.height - 100) {
				camera.y = highest - 100
				camera.modified()
			} else {
				camera.y = 0
				camera.modified()
			}
			// スコア、残り時間も移動
			scoreLabel.y = camera.y
			scoreLabel.modified()
			timeLabel.y = camera.y
			timeLabel.modified()
			// 一番高いところをスコアに
			// 小数点以下切り捨て
			g.game.vars.gameState.score = Math.round(abs)
			scoreLabel.text = `SCORE: ${g.game.vars.gameState.score}`
			scoreLabel.invalidate()
		})

		/** 一番高いところにある物体の高さを取得します。
		 * @param defaultValue もし取れなかった場合は返り値になります
		 * @returns 一番高いY座標。
		 */
		const getHighestPos = (defaultValue: number = 0): number => {
			let pos = defaultValue
			const tmpList = bodyObjectList.concat()
			if (tmpList.length > 0) {
				tmpList.sort((a, b) => {
					if (a.entity.y < b.entity.y) return -1
					if (a.entity.y > b.entity.y) return 1
					return 0
				})
				pos = tmpList[0].entity.y
			}
			return pos
		}

		/** 一番低いところにある物体の底辺の座標を取得します。
		 * 例えば■が一番下にあったとき、■のY座標から■の高さだけ引いたものです。
		 * @param defaultValue もし取れなかった場合は返り値になります
		 * @returns 低いところにある物体の底辺の座標。
		 */
		const getLowestPos = (defaultValue: number = 0): number => {
			let pos = defaultValue
			const tmpList: b2.Box2DOptions.EBody[] = []
			// 画面外の物体はいらない
			bodyObjectList.forEach(obj => {
				if (obj.entity.y <= g.game.height) {
					tmpList.push(obj)
				}
			})
			if (tmpList.length > 0) {
				tmpList.sort((a, b) => {
					if (a.entity.y < b.entity.y) return 1
					if (a.entity.y > b.entity.y) return -1
					return 0
				})
				pos = tmpList[0].entity.y - tmpList[0].entity.height
			}
			return pos
		}

		const updateHandler = () => {
			if (time <= 0) {
				// RPGアツマール環境であればランキングを表示します
				if (param.isAtsumaru) {
					const boardId = 1
					window.RPGAtsumaru.experimental.scoreboards.setRecord(boardId, g.game.vars.gameState.score).then(function () {
						window.RPGAtsumaru.experimental.scoreboards.display(boardId)
					})
				}
				scene.update.remove(updateHandler) // カウントダウンを止めるためにこのイベントハンドラを削除します
			}
			// カウントダウン処理
			time -= 1 / g.game.fps
			timeLabel.text = "TIME: " + Math.ceil(time)
			timeLabel.invalidate()
		}
		scene.update.add(updateHandler)

		// ここまでゲーム内容を記述します
	})
	g.game.pushScene(scene)


}
