/* eslint-disable no-redeclare */
/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-unused-vars */
import * as PIXI from "pixi.js";
import * as PIXI_pj from "pixi-projection";
import * as ease_func from "easing-utils";
import { Howl, Howler } from 'howler';
import $ from "jquery";
import * as node_calc from "./as/build/node_calc";

// import {BatchPluginFactory} from "@pixi/core";
// import {extensions, ExtensionType} from "@pixi/extensions";

// const BatchRenderer = BatchPluginFactory.create();
// extensions.add({
//     name: 'batch',
//     ref: BatchRenderer,
//     type: ExtensionType.RendererPlugin,
// });

// function progress_show(text){
//     $("#player #progress").html((i,org_html) => org_html + text);
// }
class Breaker{//breakをするためのクラス
    constructor(count,return_value){
        this.count = count;
        this.breaked = 0;
        this.return_value = return_value;
    }
    count_block(){
        this.breaked++;
    }
    breakable(){
        return this.breaked >= this.count;
    }
}

// class R{//breakのための返却クラス
//     constructor(return_value,breaked=false,count=0){
//         this.return_value = return_value || 0;
//         this.breaked = breaked;
//         this.count = count;
//         this.breaked_count = 0;
//     }
//     count_block(){
//         this.breaked_count++;
//     }
//     breakable(){
//         return this.breaked_count >= this.count;
//     }
// }

export class Engine{
    constructor(
        app,//画面(PIXI.Application)
        i18n,//ローカライゼーションインスタンス
        {
            engine_data,//エンジンデータの連想配列
            engine_config,//エンジンコンフィグの連想配列
            skin_data,//スキンデータの連想配列
            skin_tex,//スキンテクスチャ(Image)
            effect_data,//エフェクト音声の配列 (飛び飛び)(createObjectURL)
            BGM,//音楽(Howl)
            level_data,//レベルデータの連想配列
            particle_data,//パーティクルデータの連想配列
            particle_tex,//パーティクルテクスチャ(Image)
            background_data,//背景データの連想配列
            background_config,//背景コンフィグの連想配列
            background_tex,//背景画像
            level_option,//レベルオプション(engine config option)の配列
            system_tex,//システムで使うテクスチャ {judge,key_assign}
        },{
            key_assign=null,//キーアサイン
            debug=false,//デバッグモード
            vertices=4,//クアッドでメッシュ変形するときの頂点数(-1で射影変換)
            curv_vertices=4,//カーブさせるときの横の頂点数
            audio_offset=0,
            input_offset=0,
            render_scale=1,
            texture_scale=0.5,
            anti_aliasing=0,
            effect_volume=100,
            bgm_volume=100,
        },{
            leave_callback,
            retry_callback,
            result_callback,
            log_callback
        }
    ){
        //画面
        this.canvas = app.view;
        if("aspect-ratio" in (key_assign || {})){
            this.AspectRatio = key_assign["aspect-ratio"] ;
            if(window.innerWidth/window.innerHeight > this.AspectRatio){
                this.canvas.height = window.innerHeight;
                this.canvas.width = window.innerHeight * this.AspectRatio;
            }else{
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerWidth / this.AspectRatio;
            }
            this.C_width = this.canvas.width;
            this.C_height = this.canvas.height;
            document.body.style.backgroundColor = background_data.color;
        }else{
            this.C_width = window.innerWidth;
            this.C_height = window.innerHeight;
            this.AspectRatio = this.C_width / this.C_height;
        }

        //音楽
        this.BGM = BGM;
        this.start_time;
        this.BGM_ended = false;
        this.bgmOffset = level_data.bgmOffset || 0;
        this.wait_time = 1000;//待機時間(ms)
        this.BGM.volume(bgm_volume/100);
        
        //other
        this.hex = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"a":10,"b":11,"c":12,"d":13,"e":14,"f":15};
        this.result_callback = result_callback;
        this.system_tex = new PIXI.BaseTexture(system_tex);
        this.system_TF = {//システムテクスチャフレーム
            "judge_miss":new PIXI.Rectangle(0,84,230,50),
            "judge_good":new PIXI.Rectangle(0,34,230,50),
            "judge_great":new PIXI.Rectangle(230,34,230,50),
            "judge_perfect":new PIXI.Rectangle(230,84,230,50),
            "KeyAssign":new PIXI.Rectangle(0,0,286,34),
            "metric":new PIXI.Rectangle(0,134,300,60),
            "pause_button":new PIXI.Rectangle(300,134,60,60),
            "skip_button":new PIXI.Rectangle(360,134,60,60),
            "pause_menu":new PIXI.Rectangle(0,194,269,140),
        };
        this.i18n = i18n;

        //this.unknown_tex = PIXI.Texture.from("textures/unknown.png");

        //PIXI.js
        this.app = app;
        this.app.renderer.resize(this.C_width, this.C_height);
        this.app.stage.sortableChildren = true;

        //ステージ構築
        this.engine_stage = new PIXI.Container();
        this.engine_stage.sortableChildren = true;
        this.engine_stage.zIndex = 1;
        this.app.stage.addChild(this.engine_stage);
        this.UI_stage = new PIXI.Container();
        this.UI_stage.sortableChildren = true;
        this.UI_stage.zIndex = 2;
        this.app.stage.addChild(this.UI_stage);
        //Engine Data
        this.buckets = engine_data.buckets;
        this.archetypes = engine_data.archetypes;

        this.arc_name2idx = name => this.archetypes.findIndex(archetype => archetype.name == name);
        this.arc_idx2name = index => this.archetypes[index].name || null;

        this.efc_name2idx = name => (engine_data.effect.clips.find(clip => clip.name == name)||{id:-1}).id;
        this.efc_idx2name = index => (engine_data.effect.clips.find(clip => clip.id == index)||{name:null}).name;

        this.ptc_name2idx = name => (engine_data.particle.effects.find(effect => effect.name == name)||{id:-1}).id;
        this.ptc_idx2name = index => (engine_data.particle.effects.find(effect => effect.id == index)||{name:null}).name;

        this.skn_name2idx = name => (engine_data.skin.sprites.find(sprite => sprite.name == name)||{id:-1}).id;
        this.skn_idx2name = index => (engine_data.skin.sprites.find(sprite => sprite.id == index)||{name:null}).name;

        //アーキタイプ
        node_calc.init_archetypes(this.archetypes.length);
        for(let archetype of this.archetypes){
            node_calc.add_archetype(
                (archetype.preprocess||{index:-1}).index,
                (archetype.preprocess||{}).order||0,
                (archetype.spawnOrder||{index:-1}).index,
                (archetype.spawnOrder||{}).order||0,
                (archetype.shouldSpawn||{index:-1}).index,
                (archetype.shouldSpawn||{}).order||0,
                (archetype.initialize||{index:-1}).index,
                (archetype.initialize||{}).order||0,
                (archetype.updateSequential||{index:-1}).index,
                (archetype.updateSequential||{}).order||0,
                (archetype.touch||{index:-1}).index,
                (archetype.touch||{}).order||0,
                (archetype.updateParallel||{index:-1}).index,
                (archetype.updateParallel||{}).order||0,
                (archetype.terminate||{index:-1}).index,
                (archetype.terminate||{}).order||0,
                archetype.hasInput
            );
        }

        //this.scripts = engine_data.scripts;
        //node
        this.nodes = engine_data.nodes;
        node_calc.init_nodes(this.nodes.length);
        let func_roster = node_calc.get_function_names();//名簿
        for(let node of this.nodes){
            if("value" in node){
                node_calc.add_node(0,[node.value]);
            }else{
                if(func_roster.includes(node.func)){
                    node_calc.add_node(func_roster.findIndex((func_name) => func_name == node.func),node.args);
                }else{
                    node_calc.add_node(node_calc.name2func_id("UnknownFunction"),node.args);
                    console.error(`"${node.func}"という名前の関数は存在しません。`);
                }
            }
            
        }

        this.engine_config = engine_config;
        //options
        this.debug = debug;
        this.vertices = vertices;
        this.curv_vertices = curv_vertices;
        this.audio_offset = audio_offset;
        this.input_offset = input_offset;
        this.render_scale = render_scale;
        this.anti_aliasing = anti_aliasing;
        //level optionsのうち、特殊な効果があるオプション
        this.engine_config.options.forEach((option,i) => {
            switch(option.name){
                case "#SPEED":
                    this.BGM.rate(level_option[i]);
                    break;
            }
        });
        //entities[エンティティインデックス]{archetype:number,from_function:bool}
        this.entities = [];
        this.active_entities = [];//entitiesのインデックスの配列
        this.init_entities = [];//新しく生成されたエンティティのインデックスの配列
        //blocks
        this.blocks_names = {
            1000:"RuntimeEnvironment",
            1001:"RuntimeUpdate",
            1002:"RuntimeTouchArray",
            1003:"RuntimeSkinTransform",
            1004:"RuntimeParticleTransform",
            1005:"RuntimeBackground",
            1006:"RuntimeUI",
            1007:"RuntimeUIConfiguration",
            2000:"LevelMemory",
            2001:"LevelData",
            2002:"LevelOption",
            2003:"LevelBucket",
            2004:"LevelScore",
            2005:"LevelLife",
            3000:"EngineRom",
            4000:"EntityMemory",//関数エンティティも持ってる
            4001:"EntityData",
            4002:"EntitySharedMemory",
            4003:"EntityInfo",
            4004:"EntityDespawn",//関数エンティティも持ってる
            4005:"EntityInput",
            4101:"EntityDataArray",
            4102:"EntitySharedMemoryArray",
            4103:"EntityInfoArray",
            5000:"ArchetypeLife",
            10000:"TemporaryMemory",
        };
        // this.blocks = {
        //     "RuntimeEnvironment":[
        //         this.debug ? 1 : 0,
        //         this.AspectRatio,
        //         audio_offset,
        //         input_offset
        //     ],
        //     "RuntimeUpdate":[],
        //     "RuntimeTouchArray":[],
        //     "RuntimeSkinTransform":[
        //         1., 0., 0., 0.,
        //         0., 1., 0., 0.,
        //         0., 0., 1., 0.,
        //         0., 0., 0., 1.,
        //     ],
        //     "RuntimeParticleTransform":[
        //         1., 0., 0., 0.,
        //         0., 1., 0., 0.,
        //         0., 0., 1., 0.,
        //         0., 0., 0., 1.,
        //     ],
        //     "RuntimeBackground":[],
        //     "RuntimeUI":[],//初期値は0だが、systemが取得するときに未定義値は自動で0にするのでハードコーディングしない。
        //     "RuntimeUIConfiguration":[
        //         engine_config.ui.menuVisibility.scale,
        //         engine_config.ui.menuVisibility.alpha,
        //         engine_config.ui.judgmentVisibility.scale,
        //         engine_config.ui.judgmentVisibility.alpha,
        //         engine_config.ui.comboVisibility.scale,
        //         engine_config.ui.comboVisibility.alpha,
        //         engine_config.ui.primaryMetricVisibility.scale,
        //         engine_config.ui.primaryMetricVisibility.alpha,
        //         engine_config.ui.secondaryMetricVisibility.scale,
        //         engine_config.ui.secondaryMetricVisibility.alpha,
        //     ],
        //     "LevelMemory":[],//初期値は0だが、systemが取得するときに未定義値は自動で0にするのでハードコーディングしない。
        //     "LevelData":[],
        //     "LevelOption":[],
        //     "LevelBucket":[],
        //     "LevelScore":[],
        //     "LevelLife":[],
        //     "EngineRom":[],
        //     "EntityMemory":[],//二次元配列で管理[id][index]
        //     "EntityData":"EntityData",
        //     "EntitySharedMemory":"EntitySharedMemory",
        //     "EntityInfo":"EntityInfo",
        //     "EntityDespawn":[],//二次元配列で管理[id][index]
        //     "EntityInput":[],//二次元配列で管理[id][index]
        //     "EntityDataArray":[],
        //     "EntitySharedMemoryArray":[],
        //     "EntityInfoArray":[],
        //     "ArchetypeLife":[],
        //     "TemporaryMemory":[],
        //     // 0 : [],//Level Memory
        //     // 1 : [-1,1,this.AspectRatio,audio_offset,input_offset,render_scale,anti_aliasing],//Level Data
        //     // 2 : [],//Level Option
        //     // 3 : [//Level Transform
        //     //     1., 0., 0., 0.,
        //     //     0., 1., 0., 0.,
        //     //     0., 0., 1., 0.,
        //     //     0., 0., 0., 1.,
        //     // ],
        //     // 4 : [],//Level Background
        //     // 5 : [],//Level UI
        //     // 6 : [],//Level Bucket
        //     // 7 : [],//Level Score
        //     // 8 : [],//Level Life
        //     // 9 : [//Level UI Configuration
        //     //     engine_config.ui.menuVisibility.scale,
        //     //     engine_config.ui.menuVisibility.alpha,
        //     //     engine_config.ui.judgmentVisibility.scale,
        //     //     engine_config.ui.judgmentVisibility.alpha,
        //     //     engine_config.ui.comboVisibility.scale,
        //     //     engine_config.ui.comboVisibility.alpha,
        //     //     engine_config.ui.primaryMetricVisibility.scale,
        //     //     engine_config.ui.primaryMetricVisibility.alpha,
        //     //     engine_config.ui.secondaryMetricVisibility.scale,
        //     //     engine_config.ui.secondaryMetricVisibility.alpha,
        //     // ],
        //     // 10 : [],//Entity Info Array
        //     // 11 : [],//Entity Data Array
        //     // 12 : [],//Entity Shared Memory Array
        //     // 13 : [],//Entity Memory Array(二次元配列で管理)[id][index]
        //     // 14 : [],//Entity Input Array(二次元配列で管理)[id][index]
        //     // 20 : "Entity Info",//Entity Info
        //     // 21 : "Entity Memory",//Entity Memory
        //     // 22 : "Entity Data",//Entity Data
        //     // 23 : "Entity Input",//Entity Input
        //     // 24 : "Entity Shared Memory",//Entity Shared Memory
        //     // 30 : [],//Archetype Life
        //     // 100 : [],//Temporary Memory
        //     // 101 : [
        //     //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
        //     // ],//Temporary Data
        // }

        node_calc.init_blocks(
            [
                this.debug ? 1 : 0,
                this.AspectRatio,
                audio_offset,
                input_offset
            ],[
                engine_config.ui.menuVisibility.scale,
                engine_config.ui.menuVisibility.alpha,
                engine_config.ui.judgmentVisibility.scale,
                engine_config.ui.judgmentVisibility.alpha,
                engine_config.ui.comboVisibility.scale,
                engine_config.ui.comboVisibility.alpha,
                engine_config.ui.primaryMetricVisibility.scale,
                engine_config.ui.primaryMetricVisibility.alpha,
                engine_config.ui.secondaryMetricVisibility.scale,
                engine_config.ui.secondaryMetricVisibility.alpha,
            ],
            level_option
        );
        
        this.can_write = {
            "RuntimeEnvironment":true,"RuntimeUpdate":true,"RuntimeTouchArray":true,"RuntimeSkinTransform":true,"RuntimeParticleTransform":true,"RuntimeBackground":true,"RuntimeUI":true,"RuntimeUIConfiguration":true,
            "LevelMemory":true,"LevelData":true,"LevelOption":true,"LevelBucket":true,"LevelScore":true,"LevelLife":true,
            "EngineRom":true,
            "EntityMemory":true,"EntityData":true,"EntitySharedMemory":true,"EntityInfo":true,"EntityDespawn":true,"EntityInput":true,
            "EntityDataArray":true,"EntitySharedMemoryArray":true,"EntityInfoArray":true,
            "ArchetypeLife":true,
            "TemporaryMemory":true,
        };
        /*
        sprites(PIXI)([entity.id][オートインクリメント]{id:sprites.id, sprite:sprite, num:number, type:"quad"|"curv_LR"|"curv_TB", anchors?:クアッド})
        ※num: 
        ・初期Draw時はthis.now_numを適応
        ・再度Drawをするときはthis.now_numに書き換え(this.now_numとnumが異なるspriteのみ)(this.now_numとnumが異なるspriteがなければ追加)
        ・最後にthis.now_numとnumが異なる場合は破壊し、this.now_numを+1
        */
        this.sprites = [];
        this.now_num = 0;
        //spawn queue
        this.spawnQ = [];
        this.spawnFQ = [];
        //texture(sprites)
        this.texture_scale = texture_scale;
        this.tex_cvs = [];
        this.textures = [];
        this.tex_transforms = [];
        let transform_arg_names = ["x1","y1","x2","y2","x3","y3","x4","y4"];
        for(let sprite_decl of engine_data.skin.sprites){
            let skin_sprite = skin_data.sprites.find(sprite => sprite.name == sprite_decl.name);
            if(skin_sprite){
                let cvs = document.createElement("canvas");
                cvs.width = Math.round(skin_sprite.w * this.texture_scale);
                cvs.height = Math.round(skin_sprite.h * this.texture_scale);
                let ctx = cvs.getContext("2d");
                ctx.drawImage(skin_tex, skin_sprite.x, skin_sprite.y, skin_sprite.w, skin_sprite.h, 0, 0, cvs.width, cvs.height);
                this.textures[sprite_decl.id] = new PIXI.Texture.from(cvs);
                this.tex_cvs[sprite_decl.id] = cvs;
                node_calc.add_tex_id(sprite_decl.id);
                this.tex_transforms[sprite_decl.id] = skin_sprite.transform;
                let mat = [];
                for(let i = 0;i<8;i++){
                    for(let j = 0;j<8;j++){
                        mat.push(skin_sprite.transform[transform_arg_names[i]][transform_arg_names[j]]||0.);
                    }
                }
                node_calc.add_tex_transforms(sprite_decl.id,mat);
            }else{
                console.warn(`"${sprite_decl.name}"というスプライトがスキンに存在しませんでした。`);
            }
        }

        //関数
        this.functions = ["ExportValue","RemapClamped","Negate","Abs","Add","And","Arccos","Arcsin","Arctan","Arctan2","TimeToScaledTime","TimeToStartingScaledTime","TimeToStartingTime","TimeToTimeScale","BeatToBPM","BeatToStartingBeat","BeatToStartingTime","BeatToTime","Block","Break","DecrementPost","DecrementPostPointed","DecrementPostShifted","DecrementPre","DecrementPrePointed","DecrementPreShifted","IncrementPost","IncrementPostPointed","IncrementPostShifted","IncrementPre","IncrementPrePointed","IncrementPreShifted","Rem","GetPointed","SetPointed","SetAdd","SetAddPointed","SetAddShifted","SetDivide","SetDividePointed","SetDivideShifted","SetMod","SetModPointed","SetModShifted","SetMultiply","SetMultiplyPointed","SetMultiplyShifted","SetPower","SetPowerPointed","SetPowerShifted","SetRem","SetRemPointed","SetRemShifted","SetSubtract","SetSubtractPointed","SetSubtractShifted","Ceil","Clamp","Cos","Cosh","DebugLog","DebugPause","Degree","DestroyParticleEffect","Divide","Draw","Arguments","Return","Remarks","DrawCurvedB","DrawCurvedBT","DrawCurvedL","DrawCurvedLR","DrawCurvedR","DrawCurvedT","Equal","Execute","Floor","Frac","Get","GetShifted","Greater","GreaterOr","HasEffectClip","HasParticleEffect","HasSkinSprite","If","IsDebug","Judge","JudgeSimple","JumpLoop","Lerp","LerpClamped","Less","LessOr","Log","Max","Min","Mod","MoveParticleEffect","Multiply","Not","NotEqual","Or","Play","PlayLooped","PlayLoopedScheduled","PlayScheduled","Power","Radian","Random","RandomInteger","Remap","Round","Set","SetShifted","Sign","Sin","Sinh","Smoothstep","Spawn","SpawnParticleEffect","StopLooped","StopLoopedScheduled","Subtract","Switch","SwitchWithDefault","SwitchInteger","SwitchIntegerWithDefault","Tan","Tanh","Trunc","Unlerp","UnlerpClamped","While"];
        this.ease_functions = ["Sine", "Quad", "Cubic", "Quart", "Quint", "Expo", "Circ", "Back", "Elastic"];
        //事前実行不要関数
        this.functions_without_prerun = ["While","DoWhile","Execute","Execute0","If","Switch","SwitchWithDefault","SwitchInteger","SwitchIntegerWithDefault","And","Or"]
        //エフェクト
        this.effect_data = effect_data;
        this.effect_schedule = [];//[オートインクリメント]{time: 時間(ms), effect_id, loop_id?: ループ音声のインスタンスID}
        this.effect_loop_end_schedule = [];//[loop_id:ループ音声のインスタンスID]{time: 時間(ms)}
        this.effect_object = [];//effect_object[effect_id]howl-soundオブジェクト
        this.looped_sound_id = [];//[loop_id]{sound_id:ループしているエフェクトのsound id,effect_id:ループしているエフェクトのid}
        // this.loop_id_generated = 0;
        for(let effect_decl of engine_data.effect.clips){
            if(effect_decl.name in this.effect_data){
                this.effect_object[effect_decl.id] = this.effect_data[effect_decl.name];
                this.effect_object[effect_decl.id].volume(effect_volume/100);
                node_calc.add_efc_id(effect_decl.id);
            }else{
                console.warn(`"${effect_decl.name}"というクリップがエフェクトに存在しませんでした。`);
            }
        }
        //レベル
        this.level_data = level_data;
        this.level_option = level_option;
        this.maximum_combo = 0;
        let _changing_BPM = [];//{timing: #BEAT(拍単位で、変更するタイミング), target_bpm: #BPM(BPM単位で、目標とするBPM)}
        let _changing_TIMESCALE = [];//{timing: #BEAT(拍単位で、変更するタイミング), target_timescale: #TIMESCALE(Timeと等速を1とする単位で、目標とするタイムスケール)}
        this.level_data.entities.forEach((data,i) => {
            //Entity info
            if(data.archetype){
                if(data.archetype == "#BPM_CHANGE"){
                    _changing_BPM.push({
                        timing: data.data.find(datum => datum.name == "#BEAT").value,
                        target_bpm: data.data.find(datum => datum.name == "#BPM").value
                    });
                    node_calc.add_entity(-1,false,false);
                }else if(data.archetype == "#TIMESCALE_CHANGE"){
                    _changing_TIMESCALE.push({
                        timing: data.data.find(datum => datum.name == "#BEAT").value,
                        target_timescale: data.data.find(datum => datum.name == "#TIMESCALE").value
                    });
                    node_calc.add_entity(-1,false,false);
                }else if(this.arc_name2idx(data.archetype || "") != -1){
                    // this.blocks.EntityMemory[i] = [];
                    // this.blocks.EntityInput[i] = [0,0,-1,0];
                    // this.blocks.EntityDespawn[i] = [0];
                    node_calc.set_block_val(i,4005,0,0.);
                    node_calc.set_block_val(i,4005,1,0.);
                    node_calc.set_block_val(i,4005,2,-1.);
                    node_calc.set_block_val(i,4005,3,0.);
                    node_calc.set_block_val(i,4004,0,0.);
                    this.sprites[i] = [];
    
                    // this.blocks.EntityInfoArray[3*i] = i;
                    // this.blocks.EntityInfoArray[3*i+1] = this.arc_name2idx(data.archetype);
                    // this.blocks.EntityInfoArray[3*i+2] = 0;
                    node_calc.set_block_val(i,4003,0,i);
                    node_calc.set_block_val(i,4003,1,this.arc_name2idx(data.archetype));
                    node_calc.set_block_val(i,4003,2,0.);
                    

                    let archetype = this.archetypes[this.arc_name2idx(data.archetype)];
                    //Entity Data
                    // if("data" in archetype){//archetype
                    //     let arche_data = archetype.data;
                    //     arche_data.values.forEach((value,j) => {
                    //         this.blocks[11][32*i+arche_data.index+j] = value;
                    //     });
                    // }
                    if("data" in data){//entity
                        for(let ent_datum of data.data){
                            let datum_decl = archetype.imports.find(arc_datum => arc_datum.name == ent_datum.name);//エンティティのデータの名前でアーキタイプ内のデータ宣言から見つけたやつ
                            if(datum_decl !== undefined){
                                if("value" in ent_datum){
                                    //this.blocks.EntityDataArray[32*i+datum_decl.index] = ent_datum.value;
                                    node_calc.set_block_val(i,4001,datum_decl.index,ent_datum.value);
                                }else if("ref" in ent_datum){
                                    let refd_ent_index = this.level_data.entities.findIndex(entity => (entity.name||entity.ref) == ent_datum.ref);
                                    //this.blocks.EntityDataArray[32*i+datum_decl.index] = refd_ent_index;
                                    node_calc.set_block_val(i,4001,datum_decl.index,refd_ent_index);
                                }
                            }
                        }
                    }
    
                    //maximum_combo
                    if(archetype.hasInput){
                        this.maximum_combo++;
                    }
    
                    //entity
                    this.entities[i] = {archetype:this.arc_name2idx(data.archetype), from_function: false};
                    node_calc.add_entity(this.arc_name2idx(data.archetype),false,true);
                }else{
                    console.warn(`エンティティ index:${i}　のアーキタイプ"${data.archetype}"が存在しませんでした。`);
                    node_calc.add_entity(-1,false,false);
                }
            }else{
                console.warn(`エンティティ index:${i}　にアーキタイプが存在しませんでした。`);
                node_calc.add_entity(-1,false,false);
            }
        });

        //## BPM, BEAT, TIMESCALE ##
        //BPM
        this.init_BPM = 60;
        _changing_BPM.sort((a,b) => a.timing - b.timing);
        this.changing_BPM = [];//{start_beat:範囲の始点。拍単位, end_beat:範囲の終点。拍単位, start_time:範囲の始点。秒単位(1倍スケール), end_time:範囲の終点。秒単位(1倍スケール), BPM:範囲内のBPM, offset:Beatはtimeの一次関数とし、aをBPSとしたときのb(y切片)}

        let _beat = 0;
        let _time = 0;
        for(let i = 0;i < _changing_BPM.length;i++){
            let BPS = _changing_BPM[i].target_bpm / 60;
            _beat = _changing_BPM[i].timing;
            if(i+1 < _changing_BPM.length){
                this.changing_BPM.push({
                    start_beat: _changing_BPM[i].timing,
                    end_beat: _changing_BPM[i+1].timing,
                    start_time: _time,
                    end_time: _time + (_changing_BPM[i+1].timing - _changing_BPM[i].timing) / BPS,
                    BPM: _changing_BPM[i].target_bpm,
                    offset: _beat - BPS * _time 
                });
                _time += (_changing_BPM[i+1].timing - _changing_BPM[i].timing) / BPS;
            }else{
                this.changing_BPM.push({
                    start_beat: _changing_BPM[i].timing,
                    start_time: _time,
                    BPM: _changing_BPM[i].target_bpm,
                    offset: _beat - BPS * _time 
                });
            }
        }

        for(let step of this.changing_BPM){
            node_calc.add_changing_BPM([
                step.start_beat,
                step.end_beat||1000000,
                step.start_time,
                step.end_time||1000000,
                step.BPM,
                step.offset
            ]);
        }

        this.beat_to_time = function(beat){
            for(let step of this.changing_BPM){
                if(beat >= step.start_beat && beat <= (step.end_beat || Infinity)){
                    return (beat - step.offset) / (step.BPM / 60);
                }
            }
            return (beat - 0) / (this.init_BPM / 60);
        };

        //TIMESCALE
        _changing_TIMESCALE.sort((a,b) => a.timing - b.timing);
        this.changing_TIMESCALE = [];//{start_beat:範囲の始点。拍単位, end_beat:範囲の終点。拍単位, start_time:範囲の始点。秒単位(1倍スケール), end_time:範囲の終点。秒単位(1倍スケール), TIMESCALE:範囲内のタイムスケール, offset:ScaledTimeはtimeの一次関数とし、比例定数をTIMESCALEとしたときのy切片}

        
        if(_changing_TIMESCALE.length > 0){
            let _scaled_time = this.beat_to_time(_changing_TIMESCALE[0].timing);
            for(let i = 0;i < _changing_TIMESCALE.length;i++){
                if(i+1 < _changing_TIMESCALE.length){
                    let _start_time = this.beat_to_time(_changing_TIMESCALE[i].timing);
                    let _end_time = this.beat_to_time(_changing_TIMESCALE[i+1].timing);
                    this.changing_TIMESCALE.push({
                        start_beat: _changing_TIMESCALE[i].timing,
                        end_beat: _changing_TIMESCALE[i+1].timing,
                        start_time: _start_time,
                        end_time: _end_time,
                        TIMESCALE: _changing_TIMESCALE[i].target_timescale,
                        offset: _scaled_time - _changing_TIMESCALE[i].target_timescale * _start_time 
                    });
                    _scaled_time += (_end_time - _start_time) * _changing_TIMESCALE[i].target_timescale;
                }else{
                    let _start_time = this.beat_to_time(_changing_TIMESCALE[i].timing);
                    this.changing_TIMESCALE.push({
                        start_beat: _changing_TIMESCALE[i].timing,
                        start_time: _start_time,
                        TIMESCALE: _changing_TIMESCALE[i].target_timescale,
                        offset: _scaled_time - _changing_TIMESCALE[i].target_timescale * _start_time 
                    });
                }
            }
        }

        for(let step of this.changing_TIMESCALE){
            node_calc.add_changing_TIMESCALE([
                step.start_beat,
                step.end_beat||1000000,
                step.start_time,
                step.end_time||1000000,
                step.TIMESCALE,
                step.offset
            ]);
        }

        //particles
        /*
        this.particles[固有判別子]{
            effect: パーティクルのid,
            loop: エフェクトを繰り返すか(boolean),
            duration: 間隔,
            anchor:{ 点
                x1:number,x2:number,x3:number,x4:number,
                y1:number,y2:number,y3:number,y4:number,
            },
            sprites:[オートインクリメント]{
                sprite: PIXIのスプライト
                group_index: グループのインデックス,
                particle_index: パーティクル(グループ内)のインデックス,
                start_time: 開始時間,
                from:{ 初期値は0
                x, y, w, h, r, a
                },
                to:{ 初期値は0
                    x, y, w, h, r, a
                },
                random:[r1,r2,r3,r4], ランダム値の保存 
            }
        }
        */
        this.particles = [];

        this.particle_textures = [];
        for(let sprite of particle_data.sprites){
            let cvs = document.createElement("canvas");
            cvs.width = Math.round(sprite.w * this.texture_scale);
            cvs.height = Math.round(sprite.h * this.texture_scale);
            let ctx = cvs.getContext("2d");
            ctx.drawImage(particle_tex, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, Math.round(sprite.w * this.texture_scale), Math.round(sprite.h * this.texture_scale));
            this.particle_textures.push(new PIXI.Texture.from(cvs));
        }

        this.particle_effects = [];
        this.particle_transforms = [];
        for(let effect_decl of engine_data.particle.effects){
            let particle_effect = particle_data.effects.find(effect => effect.name == effect_decl.name);
            if(particle_effect){
                this.particle_effects[effect_decl.id] = particle_effect.groups;
                this.particle_transforms[effect_decl.id] = particle_effect.transform;
                node_calc.add_ptc_id(effect_decl.id);
                let mat = [];
                for(let i = 0;i<8;i++){
                    for(let j = 0;j<8;j++){
                        mat.push(particle_effect.transform[transform_arg_names[i]][transform_arg_names[j]]||0.);
                    }
                }
                node_calc.add_ptc_transforms(effect_decl.id,mat);
            }else{
                console.warn(`"${effect_decl.name}"というエフェクトがパーティクルに存在しませんでした。`);
            }
            
        }
        //background
        this.background_data = {data:background_data, config:background_config};
        this.background_sprite = new PIXI_pj.Sprite2d(new PIXI.Texture(new PIXI.BaseTexture(background_tex)));
        if((background_config.blur | 0) != 0){
            let filter = new PIXI.filters.BlurFilter();
            filter.blur = background_config.blur;
            this.background_sprite.filters = [filter];
        }
        switch(background_data.fit){
            case "width":
                this.fit_width();
                // this.set_background();
                break;
            case "height":
                this.fit_height();
                // this.set_background();
                break;
            case "contain":
                if(this.AspectRatio > this.background_data.data.aspectRatio){
                    this.fit_height();
                }else{
                    this.fit_width();
                }
                // this.set_background();
                break;
            case "cover":
                if(this.AspectRatio > this.background_data.data.aspectRatio){
                    this.fit_width();
                }else{
                    this.fit_height();
                }
                // this.set_background();
                break;
            default:
                console.error(`Background fitting called "${background_data.fit}" is not exist.`);
                break;
                                            
        }
        this.background_sprite.zIndex = 0;
        this.app.stage.addChild(this.background_sprite);

        //touch
        /*touch_pool[識別子]{
            x:X座標, y:Y座標, t:伝達時刻,
            sx:開始X座標, sy:開始Y座標, st:開始時刻, 
            bx:最後の更新サイクルのX座標, by:最後の更新サイクルのY座標,
            start:触り始めたか,end:離したか
        }*/
        this.touch_pool = [];
        this.touches = [];
        this.key_assign = key_assign;

        if(this.key_assign){
            //### key_assign ###
            //"Key Assign is enabled"
            this.KA_sprite = new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.KeyAssign));
            this.KA_sprite.anchor.x = 1; this.KA_sprite.anchor.y = 1;
            this.KA_sprite.x = this.C_width; this.KA_sprite.y = this.C_height;
            this.KA_sprite.alpha = 0.1;
            this.KA_sprite.zIndex = 1000;
            this.UI_stage.addChild(this.KA_sprite);

            //functions
            this.touch_func = {};
            this.flick_enable = false;
            this.flick_key = null;
            try{
                for(let key in this.key_assign["keys"]){
                    let key_obj = this.key_assign["keys"][key];
                    if(key_obj.type == 2){
                        switch(key_obj.func){
                            case "flick":
                                this.touch_func[key] = {
                                    func:"flick",
                                    press:false,
                                    first_press:null
                                };
                                this.flick_key = key;
                                break;
                            case "pause":
                                this.touch_func[key] = {
                                    func:"pause"
                                };
                                break;
                            default:
                                this.touch_func[key] = { func:"except" };
                                console.warn(`Key function called "${key_obj.func}" is not exist.`);
                                break;
                        }
                    }else if(key_obj.type == 1){
                        let assign_point = new PIXI.Sprite(PIXI.Texture.WHITE);
                        assign_point.width = 5;
                        assign_point.height = 5;
                        assign_point.anchor.set(0.5);
                        assign_point.alpha = 0.8;
                        assign_point.position.set(...this.center2LT(key_obj.x,key_obj.y));
                        this.UI_stage.addChild(assign_point);
                        let assign_indicator = new PIXI.Text(key,{fontFamily : 'Arial', fontSize: 20, fill : 0x202020, align : 'center'});
                        assign_indicator.anchor.set(0.5);
                        assign_indicator.position.set(...this.center2LT(key_obj.x,key_obj.y));
                        assign_indicator.alpha = 0.9;
                        this.UI_stage.addChild(assign_indicator);
                    }else{
                        console.warn(`Key type = ${key_obj.type} is not exist.`);
                    }
                }
            }catch(e){
                console.error(e);
                leave_callback();
                alert(this.i18n.translator("キーアサイン異常停止"));
                return;
            }
            
            this.touch_keys = {};
            this.touch_id = 0;

            document.addEventListener('keydown',this.CB_KD = e => {
                if(e.code in this.touch_func){
                    switch(this.touch_func[e.code].func){
                        case "flick":
                            if(!this.touch_func[e.code].press){
                                this.touch_func[e.code].press = true;
                                this.touch_func[e.code].first_press = null;
                                this.flick_enable = true;
                            }
                            break;
                        case "pause":
                            this.pause();
                            break;
                    }
                }else{
                    if(e.code in this.key_assign["keys"] && !(e.code in this.touch_keys)){
                        let KA = this.center2LT(this.key_assign["keys"][e.code].x,this.key_assign["keys"][e.code].y);
                        this.touch_pool[this.touch_id] = {
                            x:KA[0], y:KA[1], t:(performance.now()-this.start_time)/1000,
                            sx:KA[0], sy:KA[1], st:(performance.now()-this.start_time)/1000,
                            bx:KA[0], by:KA[1],
                            start:true, end:false,
                        };

                        this.touch_keys[e.code] = this.touch_id;
                        this.touch_id++;
                    }
                }
            });

            document.addEventListener('keyup',this.CB_KU = e => {
                if(e.code in this.touch_func){
                    switch(this.touch_func[e.code].func){
                        case "flick":
                            this.touch_func[e.code].press = false;
                            break;
                    }
                }else{
                    if(e.code in this.key_assign["keys"]){
                        this.touch_pool[this.touch_keys[e.code]].t = (performance.now()-this.start_time)/1000;
                        this.touch_pool[this.touch_keys[e.code]].end = true;
                        if(this.flick_enable){
                            if(this.touch_func[this.flick_key].first_press == null){
                                this.touch_func[this.flick_key].first_press = performance.now();
                            }
                            if(performance.now() - this.touch_func[this.flick_key].first_press < 300){//300ms以内
                                this.touch_pool[this.touch_keys[e.code]].y += this.center2LT(0,0.2)[1];//0.2移動
                            }else{
                                this.flick_enable = false;
                            }
                        }
                        delete this.touch_keys[e.code];
                    }
                }
            });
        }else{
            //### touch ###
            document.body.addEventListener("touchstart",this.CB_TS = e => {
                e.preventDefault();
                for(let touch of e.changedTouches){
                    this.touch_pool[touch.identifier] = {
                        x:touch.clientX, y:touch.clientY, t:(performance.now()-this.start_time)/1000,
                        sx:touch.clientX, sy:touch.clientY, st:(performance.now()-this.start_time)/1000,
                        bx:touch.clientX, by:touch.clientY,
                        start:true, end:false,
                    };
                }
                //console.log(this.touch_pool);
            });
            document.body.addEventListener("touchmove",this.CB_TM = e => {
                e.preventDefault();
                for(let touch of e.changedTouches){
                    this.touch_pool[touch.identifier].x = touch.clientX;
                    this.touch_pool[touch.identifier].y = touch.clientY;
                    this.touch_pool[touch.identifier].t = (performance.now()-this.start_time)/1000;
                }
                //console.log(this.touch_pool);
            });
            document.body.addEventListener("touchend",this.CB_TE = e => {
                for(let touch of e.changedTouches){
                    this.touch_pool[touch.identifier].x = touch.clientX;
                    this.touch_pool[touch.identifier].y = touch.clientY;
                    this.touch_pool[touch.identifier].t = (performance.now()-this.start_time)/1000;
                    this.touch_pool[touch.identifier].end = true;
                }
                //console.log(this.touch_pool);
            });
            document.body.addEventListener("touchcancel",this.CB_TC = e => {
                for(let touch of e.changedTouches){
                    this.touch_pool[touch.identifier].x = touch.clientX;
                    this.touch_pool[touch.identifier].y = touch.clientY;
                    this.touch_pool[touch.identifier].t = (performance.now()-this.start_time)/1000;
                    this.touch_pool[touch.identifier].end = true;
                }
            });
        }

        

        /***************
               UI
        ***************/
        //judge
        this.judge_sprites = {
            "good": new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.judge_good)),
            "great": new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.judge_great)),
            "miss": new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.judge_miss)),
            "perfect": new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.judge_perfect)),
        }
        this.judge_sprites.good.visible = false;     this.judge_sprites.good.zIndex = 2010;
        this.judge_sprites.great.visible = false;    this.judge_sprites.great.zIndex = 2010;
        this.judge_sprites.perfect.visible = false;  this.judge_sprites.perfect.zIndex = 2010;   
        this.judge_sprites.miss.visible = false;     this.judge_sprites.miss.zIndex = 2010;
        this.UI_stage.addChild(this.judge_sprites.good);
        this.UI_stage.addChild(this.judge_sprites.great);
        this.UI_stage.addChild(this.judge_sprites.perfect);
        this.UI_stage.addChild(this.judge_sprites.miss);
        this.judge_cache = {
            "type":null,
            "start_time":null
        }
        this.judge_A = this.engine_config.ui.judgmentAnimation;
        this.judge_options = {
            "time_length":Math.max(this.judge_A.scale.duration,this.judge_A.alpha.duration),
            "w":null,"h":null,
        }

        //combo
        this.combo = 0;
        this.max_combo = 0;
        this.comboVS = new PIXI.BitmapText("",{//combo value sprite
            fontName:"SansFont",
            fontSize:100,
            tint:0xCC5BCC,
            align:"center"
        });
        this.comboTS = new PIXI.BitmapText("COMBO",{//combo text sprite
            fontName:"SansFont",
            fontSize:25,
            tint:0xCC5BCC,
            align:"center"
        });
        this.comboTS.visible = this.comboVS.visible = false;
        this.UI_stage.addChild(this.comboVS);
        this.UI_stage.addChild(this.comboTS);

        //### Metrics ###
        this.arcade_score = 0;
        this.accuracy_score = 0;
        this.health = 1000;
        this.acc_result = {
            perfect:0,
            great:0,
            good:0,
            miss:0
        };
        this.metric_pos = {
            primary:{
                x:null,
                y:null,
                w:null,
                h:null,
            },
            secondary:{
                x:null,
                y:null,
                w:null,
                h:null,
            },
        }
        let metric_background = new PIXI.Texture(this.system_tex,this.system_TF.metric);
        //primaryMetric
        this.primaryMetric_graphics = new PIXI.Graphics();
        this.primaryMetric_graphics.zIndex = 0;
        this.primaryMetric_graphics.position.set(0,0);
        this.UI_stage.addChild(this.primaryMetric_graphics);
        this.primaryMetric_bar = new PIXI.Graphics();//metric bar
        this.primaryMetric_bar.zIndex = 1;
        this.primaryMetric_bar.position.set(0,0);
        this.UI_stage.addChild(this.primaryMetric_bar);
        this.primaryMetric_text = new PIXI.BitmapText("",{//metric text
            fontName:"SansFont",
            fontSize:20,
            tint:0xFFFFFF,
            align:"center"
        });
        this.primaryMetric_text.position.set(150,30);
        this.primaryMetric_text.anchor.set(.5,.5);
        this.primaryMetric_text.zIndex = 2;
        this.UI_stage.addChild(this.primaryMetric_text);
        //secondaryMetric
        this.secondaryMetric_graphics = new PIXI.Graphics();
        this.secondaryMetric_graphics.zIndex = 0;
        this.secondaryMetric_graphics.position.set(0,0);
        this.UI_stage.addChild(this.secondaryMetric_graphics);
        this.secondaryMetric_bar = new PIXI.Graphics();//metric bar
        this.secondaryMetric_bar.zIndex = 1;
        this.secondaryMetric_bar.position.set(0,0);
        this.UI_stage.addChild(this.secondaryMetric_bar);
        this.secondaryMetric_text = new PIXI.BitmapText("",{//metric text
            fontName:"SansFont",
            fontSize:20,
            tint:0xFFFFFF,
            align:"center"
        });
        this.secondaryMetric_text.position.set(150,30);
        this.secondaryMetric_text.anchor.set(.5,.5);
        this.secondaryMetric_text.zIndex = 2;
        this.UI_stage.addChild(this.secondaryMetric_text);

        //pause button
        this.pause_button = new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.pause_button));
        this.pause_button.position.set(this.C_width-70,10);
        this.pause_button.interactive = true;
        this.UI_stage.addChild(this.pause_button);
        //pause menu
        this.pause_menu = new PIXI.Sprite(new PIXI.Texture(this.system_tex,this.system_TF.pause_menu));
        this.pause_menu.anchor.set(.5,.5);
        this.pause_menu.position.set(this.C_width/2,this.C_height/2);
        this.pause_menu.zIndex = 20000;
        this.pause_menu.visible = false;
        this.UI_stage.addChild(this.pause_menu);
        //skip
        this.despawned_sprites = 0;//スコアシステムに干渉するスプライトのデスポーンした数
        this.can_skip = false;
        this.skip_button_tex = new PIXI.Texture(this.system_tex,this.system_TF.skip_button);

        this.pause_button.on("click", this.CB_PC = e => {
            if(!this.paused){
                if(this.can_skip){//スキップボタン
                    this.BGM.stop();
                    this.result_callback();
                }else{//ポーズボタン
                    this.pause();
                }
            }
        });

        this.canvas.addEventListener("touchstart",this.CB_PM = e => {//CallBack_PauseClick
            if(this.paused){//ポーズメニュー
                let clientRect = this.canvas.getBoundingClientRect();
                for(let touch of (e.changedTouches || [e])){//パソコンではchangedTouchesがないので[e]で代用
                    let x = touch.pageX - clientRect.left;
                    let y = touch.pageY - clientRect.top;
                    x -= this.C_width/2; y -= this.C_height/2;
                    if(-10 <= y && 50 >= y){
                        if(-120 <= x && -65 >= x){//リトライ
                            retry_callback();
                        }
                        if(-20 <= x && 30 >= x){//プレイ
                            this.unpause();
                        }
                        if(64 <= x && 115 >= x){//退出
                            leave_callback();
                        }
                    }
                }
            }
        });
        this.canvas.addEventListener("mousedown",this.CB_PM);

        //bucket
        this.histgram_bars = 50;
        this.bucket_values = [];
        for(let bucket of this.buckets){
            this.bucket_values.push({perfect:[],great:[],good:[],miss:[]});
        }

        //life cycle
        this.before_time;
        this.process_completed = true;
        this.paused = false;
        this.pause_start = 0;
        this.output_result = false;

        //WASMに転送
        node_calc.initializeProperties(
            this.vertices,
            this.curv_vertices,
            this.AspectRatio,
            this.C_height,
            this.C_width,
            this.init_BPM,
            this.debug
        );
    }

    // error_send(type,text){
    //     switch(type){
    //         case "warning":
    //             console.warn("WARNING:",text);
    //             break;
    //         case "system error":
    //             console.error("SYS_ERROR:",text);
    //             break;
    //         case "engine error":
    //             console.error("ENG_ERROR:",text);
    //             break;
    //     }   
    // }

    get_block(block_id){
        let vals = node_calc.get_block_vals(block_id);
        let keys = node_calc.get_block_keys(block_id);
        let block = [];
        for(let i = 0;i<keys.length;i++){
            block[keys[i]] = vals[i];
        }
        return block;
    }

    fit_width(){
        // this.blocks.RuntimeBackground = [
        //     -this.AspectRatio, -this.AspectRatio/this.background_data.data.aspectRatio,
        //     -this.AspectRatio, this.AspectRatio/this.background_data.data.aspectRatio,
        //     this.AspectRatio, this.AspectRatio/this.background_data.data.aspectRatio,
        //     this.AspectRatio, -this.AspectRatio/this.background_data.data.aspectRatio,
        // ];
        node_calc.set_block_vals(1005,[
            -this.AspectRatio, -this.AspectRatio/this.background_data.data.aspectRatio,
            -this.AspectRatio, this.AspectRatio/this.background_data.data.aspectRatio,
            this.AspectRatio, this.AspectRatio/this.background_data.data.aspectRatio,
            this.AspectRatio, -this.AspectRatio/this.background_data.data.aspectRatio,
        ]);
    }

    fit_height(){
        // this.blocks.RuntimeBackground = [
        //     -this.background_data.data.aspectRatio, -1,
        //     -this.background_data.data.aspectRatio, 1,
        //     this.background_data.data.aspectRatio, 1,
        //     this.background_data.data.aspectRatio, -1,
        // ];
        node_calc.set_block_vals(1005,[
            -this.background_data.data.aspectRatio, -1,
            -this.background_data.data.aspectRatio, 1,
            this.background_data.data.aspectRatio, 1,
            this.background_data.data.aspectRatio, -1,
        ]);
    }

    set_background(){
        //let BG_block = this.blocks.RuntimeBackground;
        let BG_block = this.get_block(1005);
        this.background_sprite.proj.mapSprite(this.background_sprite,[
            new PIXI.Point((this.C_width+BG_block[2]*this.C_height)/2,(this.C_height-BG_block[3]*this.C_height)/2),
            new PIXI.Point((this.C_width+BG_block[4]*this.C_height)/2,(this.C_height-BG_block[5]*this.C_height)/2),
            new PIXI.Point((this.C_width+BG_block[6]*this.C_height)/2,(this.C_height-BG_block[7]*this.C_height)/2),
            new PIXI.Point((this.C_width+BG_block[0]*this.C_height)/2,(this.C_height-BG_block[1]*this.C_height)/2),
        ]);
    }

    destroy(){
        //remove events
        this.pause_button.off("click",this.CB_PC);
        this.canvas.removeEventListener("touchstart",this.CB_PM);
        this.canvas.removeEventListener("mousedown",this.CB_PM);
        if(this.key_assign){
            document.removeEventListener('keydown',this.CB_KD);
            document.removeEventListener('keyup',this.CB_KU);
        }else{
            document.body.removeEventListener("touchstart",this.CB_TS);
            document.body.removeEventListener("touchmove",this.CB_TM);
            document.body.removeEventListener("touchend",this.CB_TE);
            document.body.removeEventListener("touchcancel",this.CB_TC);
        }

        //this.app.stage.removeChildren();
        //PIXI.utils.destroyTextureCache();
        this.app.ticker.remove(this.game_tick);
        this.app.destroy(true,{
            children: true,
            texture: true,
            baseTexture: true,
        });

        node_calc.reset_vars();
    }
    
    /*############################

        　　　　サイクル

    ############################*/

    pause(){
        this.paused = true;
        this.pause_start = performance.now();
        this.BGM.pause();
        this.pause_menu.visible = true;
        for(let [unique_id,loop_instace] of Object.entries(this.looped_sound_id)){
            this.effect_object[loop_instace.effect_id].pause(loop_instace.sound_id);
        }
    }

    unpause(){
        this.paused = false;
        let elapsed_time = performance.now() - this.pause_start;
        this.start_time += elapsed_time;
        this.before_time += elapsed_time;
        this.BGM.play();
        this.pause_menu.visible = false;
        for(let [unique_id,loop_instace] of Object.entries(this.looped_sound_id)){
            this.effect_object[loop_instace.effect_id].play(loop_instace.sound_id);
        }
    }

    calc_scale(fw,fh,tw,th){
        if(tw){
            if(th){
                return [
                    (tw*this.C_height/1.5) / fw,
                    (th*this.C_height/1.5) / fh
                ];
            }else{
                return [
                    (tw*this.C_height/1.5) / fw,
                    (tw*this.C_height/1.5) / fw
                ];
            }
        }else{
            return [
                (th*this.C_height/1.5) / fh,
                (th*this.C_height/1.5) / fh
            ];
        }
    }

    preparation(){//準備
        // this.blocks[1][0] = 0;
        // this.blocks[1][1] = 0;

        node_calc.preprocess();
        //let UI_block = this.blocks.RuntimeUI;
        let UI_block = this.get_block(1006);

        //pause button
        this.pause_button.position.set(...this.center2LT(UI_block[0],UI_block[1]));
        this.pause_button.anchor.set(UI_block[2],1-UI_block[3]);
        this.pause_button.width = this.C_height/2*UI_block[4];
        this.pause_button.height = this.C_height/2*UI_block[5];
        this.pause_button.rotation = UI_block[6];
        this.pause_button.alpha = UI_block[7];

        //judge
        this.judge_options.w = this.judge_options.h = (UI_block[15]*this.C_height/2) / 50;
        for(let [_,sprite] of Object.entries(this.judge_sprites)){
            sprite.anchor.set(UI_block[12],UI_block[13]);
            sprite.position.set(...this.center2LT(UI_block[10],UI_block[11]));
            sprite.scale.set(this.judge_options.w,this.judge_options.h);
        }

        //combo value
        this.comboVS.anchor.set(UI_block[22],1-UI_block[23]);
        this.comboVS.position.set(...this.center2LT(UI_block[20],UI_block[21]));
        this.comboVS.fontSize = Math.round(this.C_height/2*UI_block[25]);
        this.comboVS.alpha = UI_block[27];

        //combo text
        this.comboTS.anchor.set(UI_block[32],1-UI_block[33]);
        this.comboTS.position.set(...this.center2LT(UI_block[30],UI_block[31]));
        this.comboTS.fontSize = Math.round(this.C_height/2*UI_block[35]);
        this.comboTS.alpha = UI_block[37];

        //primary metric bar
        var [x,y] = this.center2LT(UI_block[40],UI_block[41]);
        var w = this.C_height/2*UI_block[44];
        var h = this.C_height/2*UI_block[45];
        x -= UI_block[42]*w;
        y -= (1-UI_block[43])*h;
        this.primaryMetric_graphics.beginFill(0x500050);
        this.primaryMetric_graphics.drawRect(x,y,w,h);
        this.primaryMetric_graphics.beginFill(0x300030);
        this.primaryMetric_graphics.drawRect(x+this.C_height*0.02,y+h*0.25,w-this.C_height*0.04,h*0.5);
        this.primaryMetric_graphics.endFill();
        this.primaryMetric_graphics.alpha = UI_block[47];
        this.metric_pos.primary = {
            x: x+this.C_height*0.02, y: y+h*0.25, w: w-this.C_height*0.04, h: h*0.5
        };

        //primary metric value
        this.primaryMetric_text.anchor.set(UI_block[52],1-UI_block[53]);
        this.primaryMetric_text.position.set(...this.center2LT(UI_block[50],UI_block[51]));
        this.primaryMetric_text.fontSize = Math.round(this.C_height/2.5*UI_block[55]);
        this.primaryMetric_text.align = UI_block[58] == -1?"left":UI_block[58] == 0?"center":"right";
        this.primaryMetric_text.alpha = UI_block[57];

        //secondary metric bar
        var [x,y] = this.center2LT(UI_block[60],UI_block[61]);
        var w = this.C_height/2*UI_block[64];
        var h = this.C_height/2*UI_block[65];
        x -= UI_block[62]*w;
        y -= (1-UI_block[63])*h;
        this.secondaryMetric_graphics.beginFill(0x500050);
        this.secondaryMetric_graphics.drawRect(x,y,w,h);
        this.secondaryMetric_graphics.beginFill(0x300030);
        this.secondaryMetric_graphics.drawRect(x+this.C_height*0.02,y+h*0.25,w-this.C_height*0.04,h*0.5);
        this.secondaryMetric_graphics.endFill();
        this.secondaryMetric_graphics.alpha = UI_block[67];
        this.metric_pos.secondary = {
            x: x+this.C_height*0.02, y: y+h*0.25, w: w-this.C_height*0.04, h: h*0.5
        };

        //secondary metric value
        this.secondaryMetric_text.anchor.set(UI_block[72],1-UI_block[73]);
        this.secondaryMetric_text.position.set(...this.center2LT(UI_block[70],UI_block[71]));
        this.secondaryMetric_text.fontSize = Math.round(this.C_height/2.5*UI_block[75]);
        this.secondaryMetric_text.align = UI_block[78] == -1?"left":UI_block[78] == 0?"center":"right";
        this.secondaryMetric_text.alpha = UI_block[77];

        this.set_background();

        //bucket 
        this.bucket_config = this.get_block(2003);

        node_calc.spawnOrder();
        this.game_start();//実行
    }

    async game_tick(){
        this.frames++;
        if(!this.paused){
            //system cycle
            this.play_effect();
            this.particle_update();
            this.sprite_update();
            this.UI_update();
            this.update_block();
            //engine cycle
            node_calc.shouldSpawn();
            node_calc.initialize();
            node_calc.updateSequential();
            this.update_touch();
            node_calc.input_callback();
            node_calc.updateParallel();
            this.despawn_process(node_calc.despawning());
        }
    }

    game_start(){//ゲーム開始
        this.BGM.once("play",() => {
            $("#player #progress").hide();
            $("#player #window").show();
            $("#player").append(this.canvas);
            this.start_time = performance.now() + this.bgmOffset*1000 + this.audio_offset * 1000;
            this.before_time = performance.now() + this.bgmOffset*1000 + this.audio_offset * 1000;

            //フレームレート
            this.frames = 0;
            this.app.ticker.add(this.game_tick.bind(this));
            this.fps_interval = setInterval(()=>{
                if(!this.paused){
                    console.log(`${this.frames}fps ${1000/this.frames}ms`);
                }
                this.frames = 0;
            },1000);
        });
        this.BGM.on("end",() => {
            if(this.despawned_sprites >= this.maximum_combo){
                this.result_callback();
            }else{
                this.BGM_ended = false;
            }
        });
        this.BGM.play();
    }

    game_end(){
        clearInterval(this.fps_interval);
        this.BGM.stop();
        for(let [unique_id,loop_instace] of Object.entries(this.looped_sound_id)){
            this.effect_object[loop_instace.effect_id].stop(loop_instace.sound_id);
        }
        this.bucket_rendering();
        this.destroy();
    }

    bucket_rendering(){
        this.rendered_bucket_graph = [];
        for(let [i,bucket] of Object.entries(this.buckets)){
            let whole_min = Math.min(this.bucket_config[i*6],Math.min(this.bucket_config[i*6+2],this.bucket_config[i*6+4]));
            let whole_max = Math.max(this.bucket_config[i*6+1],Math.max(this.bucket_config[i*6+3],this.bucket_config[i*6+5]));

            let bucket_graphs = {};
            
            for(let item of ["all","perfect","great","good","miss"]){
                //canvas準備
                let graph = document.createElement("canvas");
                graph.width = 1000;
                graph.height = 300;
                let ctx = graph.getContext("2d");
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#FFFFFF";

                //枠
                ctx.beginPath();
                ctx.moveTo(28,70);
                ctx.lineTo(28,262);
                ctx.lineTo(972,262);
                ctx.lineTo(972,70);
                ctx.stroke();

                //基準
                ctx.fillStyle = "#FFFFFF";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                for(let j = 0;j<=10;j++){
                    let t = whole_min + (whole_max - whole_min) * (j/10);
                    ctx.font = "15px Arial";
                    ctx.fillText(String(Math.floor(t*100)/100), 30+(970-30)*(j/10), 273);
                    ctx.font = "10px Arial";
                    if(this.i18n.is_label_included(bucket.unit)) ctx.fillText(this.i18n.get_label(bucket.unit), 30+(970-30)*(j/10), 288);
                    ctx.fillRect(26+(970-26)*(j/10),264,4,6);
                }

                //ヒストグラム
                let histgram = [];
                let max_count = 1;//ゼロ除算を回避
                
                for(let j = 0;j<this.histgram_bars;j++){//集計
                    let class_min = whole_min + (whole_max - whole_min) * (j/this.histgram_bars);
                    let class_max = whole_min + (whole_max - whole_min) * ((j+1)/this.histgram_bars);

                    histgram.push(0);
                    if(item == "perfect" || item == "all"){
                        for(let val of this.bucket_values[i].perfect){
                            if(val >= class_min && val < class_max){ histgram[j]++; }
                        }
                    }
                    if(item == "great" || item == "all"){
                        for(let val of this.bucket_values[i].great){
                            if(val >= class_min && val < class_max){ histgram[j]++; }
                        }
                    }
                    if(item == "good" || item == "all"){
                        for(let val of this.bucket_values[i].good){
                            if(val >= class_min && val < class_max){ histgram[j]++; }
                        }
                    }
                    if(item == "miss" || item == "all"){
                        for(let val of this.bucket_values[i].miss){
                            if(val >= class_min && val < class_max){ histgram[j]++; }
                        }
                    }

                    if(histgram[j] > max_count){
                        max_count = histgram[j];
                    }
                }

                ctx.fillStyle = "#aaaaaaaa";
                for(let j = 0;j<this.histgram_bars;j++){//描画
                    ctx.fillRect(
                        30+(970-30)*(j/this.histgram_bars),
                        70+(260-70)*(1-(histgram[j]/max_count)),
                        (970-30)/this.histgram_bars,
                        (260-70)*(histgram[j]/max_count)
                    );
                }

                //スプライト
                let highest_pos = 0;
                let lowest_pos = 0;
                for(let sprite of bucket.sprites){//サイズを測定
                    let rotate = sprite.rotation * Math.PI / 180;
                    //左上
                    let y = Math.sin(rotate) * (-sprite.w/2) + Math.cos(rotate) * sprite.h/2 + sprite.y;
                    if(highest_pos < y) highest_pos = y;
                    if(lowest_pos > y) lowest_pos = y;
                    //右上
                    y = Math.sin(rotate) * sprite.w/2 + Math.cos(rotate) * sprite.h/2 + sprite.y;
                    if(highest_pos < y) highest_pos = y;
                    if(lowest_pos > y) lowest_pos = y;
                    //右下
                    y = Math.sin(rotate) * sprite.w/2 + Math.cos(rotate) * (-sprite.h/2) + sprite.y;
                    if(highest_pos < y) highest_pos = y;
                    if(lowest_pos > y) lowest_pos = y;
                    //右下
                    y = Math.sin(rotate) * (-sprite.w/2) + Math.cos(rotate) * (-sprite.h/2) + sprite.y;
                    if(highest_pos < y) highest_pos = y;
                    if(lowest_pos > y) lowest_pos = y;
                }

                //描画
                let ratio = (60-10)/(highest_pos-lowest_pos);
                for(let sprite of bucket.sprites){
                    if(sprite.id in this.tex_cvs){
                        this.drawRotatedImage(
                            ctx,
                            this.tex_cvs[sprite.id],
                            500 + sprite.x * ratio,
                            (60-10)/2 - sprite.y * ratio,
                            sprite.w * ratio,
                            sprite.h * ratio,
                            sprite.rotation
                        );
                    }else if(sprite.fallbackId in this.tex_cvs){
                        this.drawRotatedImage(
                            ctx,
                            this.tex_cvs[sprite.fallbackId],
                            500 + sprite.x * ratio,
                            (60-10)/2 - sprite.y * ratio,
                            sprite.w * ratio,
                            sprite.h * ratio,
                            sprite.rotation
                        );
                    }else{
                        console.warn(`"${sprite.id}"(fallback:${sprite.fallbackId})はスキンに存在しません。`);
                    }
                }
                
                graph.classList.add("bucket-graph");

                bucket_graphs[item] = graph;
            }

            this.rendered_bucket_graph.push(bucket_graphs);
        }
    }

    drawRotatedImage(context, image, x, y, w, h, angle){
        // コンテキストを保存する
        context.save();
        // 回転の中心に原点を移動する
        context.translate(x, y);
        // canvasを回転する
        context.rotate(-angle * Math.PI / 180);
        // 画像サイズの半分だけずらして画像を描画する
        context.drawImage(image, -(w/2), -(h/2), w, h);
        // コンテキストを元に戻す
        context.restore();
    }

    metric_update(metric,text,bar){
        if(metric == "primary"){
            let pos = this.metric_pos.primary;
            this.primaryMetric_text.text = text;
            this.primaryMetric_bar.clear();
            this.primaryMetric_bar.beginFill(0x960096);
            this.primaryMetric_bar.drawRect(pos.x,pos.y,Math.round(bar*pos.w),pos.h);
            this.primaryMetric_bar.endFill();
        }else{
            let pos = this.metric_pos.secondary;
            this.secondaryMetric_text.text = text;
            this.secondaryMetric_bar.clear();
            this.secondaryMetric_bar.beginFill(0x960096);
            this.secondaryMetric_bar.drawRect(pos.x,pos.y,Math.round(bar*pos.w),pos.h);
            this.secondaryMetric_bar.endFill();
        }
    }

    UI_update(){
        //judge
        //if(this.judge_cache.type && (this.blocks.RuntimeUI[19]?false:true)){
        if(this.judge_cache.type && !node_calc.get_block_val(0,1006,19)){
            let elapsed_time = (performance.now() - this.judge_cache.start_time)/1000;
            if(elapsed_time > this.judge_options.time_length){
                this.judge_sprites[this.judge_cache.type].visible = false;
                this.judge_cache.type = null;
            }else{
                //scale
                if(elapsed_time < this.judge_A.scale.duration){
                    let scale = this.judge_A.scale.from + (this.judge_A.scale.to - this.judge_A.scale.from) * this.ease_function(this.judge_A.scale.ease,elapsed_time / this.judge_A.scale.duration);
                    this.judge_sprites[this.judge_cache.type].scale.set(this.judge_options.w*scale,this.judge_options.h*scale);
                }
                //alpha
                if(elapsed_time < this.judge_A.alpha.duration){
                    let alpha = this.judge_A.alpha.from + (this.judge_A.alpha.to - this.judge_A.alpha.from) * this.ease_function(this.judge_A.alpha.ease,elapsed_time / this.judge_A.alpha.duration);
                    this.judge_sprites[this.judge_cache.type].alpha = alpha;
                }
            }
        }
        //metric
        //primary
        switch(this.engine_config.ui.primaryMetric){
            case "arcade":
                this.metric_update("primary", `SCORE: ${Math.round(this.arcade_score/this.maximum_combo *1000000)}`, this.arcade_score/this.maximum_combo);
                break;
            case "accuracy":
                this.metric_update("primary", `ACCURACY: ${Math.round(this.accuracy_score/this.maximum_combo *1000000)}`, this.accuracy_score/this.maximum_combo);
                break;
            case "life":
                this.metric_update("primary", `LIFE: ${this.health}`, this.health / 1000);
                break;
            default:
                this.metric_update("primary", `${this.engine_config.ui.primaryMetric}: unknown`, .5);
                break;
        }
        //secondary
        switch(this.engine_config.ui.secondaryMetric){
            case "arcade":
                this.metric_update("secondary", `SCORE: ${Math.round(this.arcade_score/this.maximum_combo *1000000)}`, this.arcade_score/this.maximum_combo);
                break;
            case "accuracy":
                this.metric_update("secondary", `ACCURACY: ${Math.round(this.accuracy_score/this.maximum_combo *1000000)}`, this.accuracy_score/this.maximum_combo);
                break;
            case "life":
                this.metric_update("secondary", `LIFE: ${this.health}`, this.health / 1000);
                break;
            default:
                this.metric_update("secondary", `${this.engine_config.ui.secondaryMetric}: unknown`, .5);
                break;
        }
        //background
        if(node_calc.update_background.value){
            this.set_background();
            node_calc.update_background.value = false;
        }
    }

    update_block(){
        // this.blocks.RuntimeUpdate[0] = (performance.now() - this.start_time)/1000;
        // this.blocks.RuntimeUpdate[1] = (performance.now() - this.before_time)/1000;
        // let time = this.blocks.RuntimeUpdate[0];
        let current_time = performance.now();
        let time = (current_time - this.start_time)/1000;
        node_calc.set_block_val(0,1001,0,time);
        node_calc.set_block_val(0,1001,1,(current_time - this.before_time)/1000);

        //Scaled time
        let ST_updated = false;
        for(let step of this.changing_TIMESCALE){
            if(time >= step.start_time && time <= (step.end_time || Infinity)){
                //this.blocks.RuntimeUpdate[2] = step.TIMESCALE * time + step.offset;
                node_calc.set_block_val(0,1001,2,step.TIMESCALE * time + step.offset);
                ST_updated = true;
                //console.log(step.TIMESCALE * time + step.offset);
                break;
            }
        }
        if(!ST_updated){
            //this.blocks.RuntimeUpdate[2] = time;
            node_calc.set_block_val(0,1001,2,time);
            //console.log(time);
        }

        this.before_time = current_time;
    }

    sprite_update(){//スプライトの更新
        let spawned_entities = node_calc.spawned_entities.value;
        for(let i = 0;i<spawned_entities;i++){
            this.sprites.push([]);
            this.entities.push({archetype:0, from_function: true});
        }
        node_calc.spawned_entities.value = 0;

        let draw_queue = node_calc.request_serialized_draw_queue();
        let offset = 0;
        while(offset < draw_queue.length){
            let info = draw_queue.slice(offset,offset+6);
            let uv_len = draw_queue[offset+6];
            let uv = draw_queue.slice(offset+7,offset+7+uv_len);

            switch(info[5]){
                case 0:
                    this.draw_process(info[0],info[1],info[2],info[3],uv);
                    break;
                case 1:
                    this.draw_curved_LR_process(info[0],info[1],info[2],info[3],info[4],uv);
                    break;
                case 2:
                    this.draw_curved_TB_process(info[0],info[1],info[2],info[3],info[4],uv);
                    break;
            }

            offset += 7 + uv_len;
        }
        node_calc.refresh_draw_queue();

        for(let entity of this.sprites){
            for(let i in entity){
                if(entity[i].num != this.now_num){
                    entity[i].sprite.destroy();
                    delete entity[i];
                }
            }
        }
        this.now_num++;
    }

    draw_process(entity_id,sprite_id,z_index,alpha,uvs){
        let last_sprite;
        try{
            
        for(let sprite of this.sprites[entity_id]){
            if(sprite){
                if(sprite.id == sprite_id && sprite.num != this.now_num && sprite.type == "quad-mesh"){
                    last_sprite = sprite;
                    break;
                }
            }
        }
        if(last_sprite){
            let prev_uvs = last_sprite.sprite.geometry.buffers[0].data;
            let tr = (this.vertices-1)*2; let bl = this.vertices*2*(this.vertices-1); let br = this.vertices*2*this.vertices-2;
            if(
                !(uvs[0] == prev_uvs[0] && uvs[1] == prev_uvs[1] && 
                uvs[tr] == prev_uvs[tr] && uvs[tr+1] == prev_uvs[tr+1] && 
                uvs[bl] == prev_uvs[bl] && uvs[bl+1] == prev_uvs[bl+1] && 
                uvs[br] == prev_uvs[br] && uvs[br+1] == prev_uvs[br+1])
            ){
                last_sprite.sprite.geometry.buffers[0].data = uvs;
                last_sprite.sprite.geometry.buffers[0].update();
            }
            if(last_sprite.sprite.zIndex != z_index){
                last_sprite.sprite.zIndex = z_index;
            }
            if(last_sprite.sprite.alpha != alpha){
                last_sprite.sprite.alpha = alpha;
            }
            last_sprite.num = this.now_num;
        }else{
            let sprite = new PIXI.SimplePlane(this.textures[sprite_id], this.vertices, this.vertices);
            sprite.geometry.buffers[0].data = uvs;
            sprite.geometry.buffers[0].update();
            sprite.zIndex = z_index;
            sprite.alpha = alpha;
            this.engine_stage.addChild(sprite);
            this.sprites[entity_id].push({
                id:sprite_id,
                sprite:sprite,
                num:this.now_num,
                n:0,
                type:"quad-mesh"
            });
        }

        }catch(e){
            // console.log(e.message,Object.keys(this.sprites),entity_id);
            console.warn(e);
        }
    }

    draw_curved_LR_process(entity_id,sprite_id,z_index,alpha,n,uvs){
        let last_sprite;
        for(let sprite of this.sprites[entity_id]){
            if(sprite){
                if(sprite.id == sprite_id && sprite.num != this.now_num && sprite.type == "curv_LR" && n == sprite.n){
                    last_sprite = sprite;
                    break;
                }
            }
        }
        if(last_sprite){
            let prev_uvs = last_sprite.sprite.geometry.buffers[0].data;
            let tr = (this.curv_vertices-1)*2; let bl = this.curv_vertices*2*(n-1); let br = this.curv_vertices*2*n-2;
            if(
                !(uvs[0] == prev_uvs[0] && uvs[1] == prev_uvs[1] && 
                uvs[tr] == prev_uvs[tr] && uvs[tr+1] == prev_uvs[tr+1] && 
                uvs[bl] == prev_uvs[bl] && uvs[bl+1] == prev_uvs[bl+1] && 
                uvs[br] == prev_uvs[br] && uvs[br+1] == prev_uvs[br+1])
            ){
                last_sprite.sprite.geometry.buffers[0].data = uvs;
                last_sprite.sprite.geometry.buffers[0].update();
            }
            if(last_sprite.sprite.zIndex != z_index){
                last_sprite.sprite.zIndex = z_index;
            }
            if(last_sprite.sprite.alpha != alpha){
                last_sprite.sprite.alpha = alpha;
            }
            last_sprite.num = this.now_num;
        }else{
            let sprite = new PIXI.SimplePlane(this.textures[sprite_id], this.curv_vertices, n);
            sprite.geometry.buffers[0].data = uvs;
            sprite.geometry.buffers[0].update();
            sprite.zIndex = z_index;
            sprite.alpha = alpha;
            this.engine_stage.addChild(sprite);
            this.sprites[entity_id].push({
                id:sprite_id,
                sprite:sprite,
                num:this.now_num,
                n:n,
                type:"curv_LR"
            });
        }
    }

    draw_curved_TB_process(entity_id,sprite_id,z_index,alpha,n,uvs){
        let last_sprite;
        for(let sprite of this.sprites[entity_id]){
            if(sprite){
                if(sprite.id == sprite_id && sprite.num != this.now_num && sprite.type == "curv_TB" && n == sprite.n){
                    last_sprite = sprite;
                    break;
                }
            }
        }
        if(last_sprite){
            let prev_uvs = last_sprite.sprite.geometry.buffers[0].data;
            let tr = (n-1)*2; let bl = n*2*(this.curv_vertices-1); let br = this.curv_vertices*2*n-2;
            if(
                !(uvs[0] == prev_uvs[0] && uvs[1] == prev_uvs[1] && 
                uvs[tr] == prev_uvs[tr] && uvs[tr+1] == prev_uvs[tr+1] && 
                uvs[bl] == prev_uvs[bl] && uvs[bl+1] == prev_uvs[bl+1] && 
                uvs[br] == prev_uvs[br] && uvs[br+1] == prev_uvs[br+1])
            ){
                last_sprite.sprite.geometry.buffers[0].data = uvs;
                last_sprite.sprite.geometry.buffers[0].update();
            }
            if(last_sprite.sprite.zIndex != z_index){
                last_sprite.sprite.zIndex = z_index;
            }
            if(last_sprite.sprite.alpha != alpha){
                last_sprite.sprite.alpha = alpha;
            }
            last_sprite.num = this.now_num;
        }else{
            let sprite = new PIXI.SimplePlane(this.textures[sprite_id], n, this.curv_vertices);
            sprite.geometry.buffers[0].data = uvs;
            sprite.geometry.buffers[0].update();
            sprite.zIndex = z_index;
            sprite.alpha = alpha;
            this.engine_stage.addChild(sprite);
            this.sprites[entity_id].push({
                id:sprite_id,
                sprite:sprite,
                num:this.now_num,
                n:n,
                type:"curv_TB"
            });
        }
    }


    play_effect(){//スケジュールされたエフェクトを再生、スケジュールされたループエフェクトを停止
        let effect_queue = node_calc.effect_queue.value;
        effect_queue.forEach((queue,i) => {
            if(queue[0] == -1){//stop loop
                this.effect_loop_end_schedule.push({
                    time: queue[1] * 1000,
                    loop_id: queue[2]
                });
            }else{
                if(queue[2] == -1){//play
                    this.effect_schedule.push({
                        time: queue[1] * 1000,
                        effect_id: queue[0],
                        loop_id: -1
                    });
                }else{//play loop
                    this.effect_schedule.push({
                        time: queue[1] * 1000,
                        effect_id: queue[0],
                        loop_id: queue[2]
                    });
                }
            }
        });
        node_calc.refresh_effect_queue();

        let now = performance.now() - this.start_time;
        this.effect_schedule = this.effect_schedule.filter((schedule,i) => {
            if(schedule.time <= now){
                if(schedule.loop_id != -1){
                    let sound_id = this.effect_object[schedule.effect_id].play();
                    this.effect_object[schedule.effect_id].loop(true,sound_id);
                    this.looped_sound_id[schedule.loop_id] = {sound_id:sound_id, effect_id:schedule.effect_id};
                }else{
                    let sound_id = this.effect_object[schedule.effect_id].play();
                    this.effect_object[schedule.effect_id].loop(false,sound_id);
                }
                return false;
            }else{
                return true;
            }
        });
        this.effect_loop_end_schedule = this.effect_loop_end_schedule.filter((schedule,i) => {
            if(schedule.time <= now){
                if(schedule.loop_id in this.looped_sound_id){
                    let loop_effect = this.looped_sound_id[schedule.loop_id];
                    this.effect_object[loop_effect.effect_id].stop(loop_effect.sound_id);
                    delete this.looped_sound_id[schedule.loop_id];
                }else{
                    console.warn(`loop_id:${schedule.loop_id} はループエフェクト一覧に存在しません。`);
                }
                return false;
            }else{
                return true;
            }
        });
    }

    particle_update(){
        for(let step of node_calc.particle_queue.value){
            if(step[1] == 0){
                this.SpawnParticleEffect(...step.slice(2),step[0]);
            }else if(step[1] == 1){
                this.MoveParticleEffect(step[0],...step.slice(2));
            }else if(step[1] == 2){
                this.DestroyParticleEffect(step[0]);
            }else{
                console.error(`${step[1]}というparticle orderは存在しません。`);
            }
        }
        node_calc.refresh_ptc_queue();

        let now_time = performance.now();
        for(let [unique_id, prtc_obj] of Object.entries(this.particles)){
            let elapsed_time = now_time - prtc_obj.start_time;
            if(elapsed_time >= prtc_obj.duration){
                if(prtc_obj.loop){
                    prtc_obj.start_time = now_time;
                }else{
                    //パーティクル破棄
                    for(let spr_obj of prtc_obj.sprites){
                        spr_obj.sprite.destroy();
                    }
                    delete this.particles[unique_id];
                    continue;
                }
            }
            for(let spr_obj of prtc_obj.sprites){
                let particle = this.particle_effects[prtc_obj.effect][spr_obj.group_index].particles[spr_obj.particle_index];
                if(prtc_obj.duration * particle.start <= elapsed_time && elapsed_time <= prtc_obj.duration * (particle.start + particle.duration)){
                    let t = (elapsed_time - prtc_obj.duration * particle.start)/(prtc_obj.duration * particle.duration);// 0 <= t <= 1 
                    
                    let x = this.calc_property_with_ease(t, spr_obj.from.x, spr_obj.to.x, particle.x.ease);
                    let y = this.calc_property_with_ease(t, spr_obj.from.y, spr_obj.to.y, particle.y.ease);
                    let w = this.calc_property_with_ease(t, spr_obj.from.w, spr_obj.to.w, particle.w.ease);
                    let h = this.calc_property_with_ease(t, spr_obj.from.h, spr_obj.to.h, particle.h.ease);
                    let r = this.calc_property_with_ease(t, spr_obj.from.r, spr_obj.to.r, particle.r.ease);
                    let a = this.calc_property_with_ease(t, spr_obj.from.a, spr_obj.to.a, particle.a.ease);
                    
                    spr_obj.sprite.alpha = a;
                    let [x1,y1,x2,y2,x3,y3,x4,y4] = this.calc_particle_positon(
                        prtc_obj.anchor.x1,
                        prtc_obj.anchor.y1,
                        prtc_obj.anchor.x2,
                        prtc_obj.anchor.y2,
                        prtc_obj.anchor.x3,
                        prtc_obj.anchor.y3,
                        prtc_obj.anchor.x4,
                        prtc_obj.anchor.y4,
                        x,y,w,h,r
                    );


                    let uvs = spr_obj.sprite.geometry.buffers[0].data;
                    t = 0;
                    for (let i = 0; i < this.vertices; i++) {
                        t = i/(this.vertices-1);
                        let sx = (x1-x2)*t+x2; let sy = (y1-y2)*t+y2;
                        let ex = (x4-x3)*t+x3; let ey = (y4-y3)*t+y3;
                        for (let j = 0; j < this.vertices; j++) {
                            t = j/(this.vertices-1);
                            uvs[i*this.vertices*2+j*2] = (ex-sx)*t+sx;
                            uvs[i*this.vertices*2+j*2+1] = (ey-sy)*t+sy;
                        }
                    }
                    spr_obj.sprite.geometry.buffers[0].update();

                    spr_obj.sprite.visible = true;
                }else{
                    spr_obj.sprite.visible = false;
                }
            }
        }

        // for(let index in this.particles){
        //     let prtc_obj = this.particles[index];
        //     for(let spr_i in prtc_obj.sprites){
        //         let spr_obj = prtc_obj.sprites[spr_i];
        //         let particle = this.particle_effects[prtc_obj.effect][spr_obj.group_index].particles[spr_obj.particle_index];
        //         let elapsed_time = now_time - spr_obj.start_time;
        //         if(prtc_obj.duration*particle.duration < elapsed_time){//次
        //             //elapsed_time = now_time - spr_obj.start_time;
        //             //次のパーティクルエフェクト
        //             spr_obj.particle_index++;
        //             let do_break = false;
        //             if(this.particle_effects[prtc_obj.effect][spr_obj.group_index].particles.length <= spr_obj.particle_index){
        //                 if(prtc_obj.loop){
        //                     spr_obj.particle_index = 0;
        //                     spr_obj.random = this.generate_random();
        //                     spr_obj.start_time = performance.now();
        //                     do_break = true;
        //                 }else{
        //                     //パーティクル破棄
        //                     spr_obj.sprite.destroy();
        //                     delete prtc_obj.sprites[spr_i];
        //                     if(!Object.keys(prtc_obj.sprites).length){   
        //                         delete this.particles[index];
        //                     }
        //                     break;
        //                 }
        //             }
        //             particle = this.particle_effects[prtc_obj.effect][spr_obj.group_index].particles[spr_obj.particle_index];

        //             spr_obj.from = {
        //                 x: this.calc_property(particle.x.from,spr_obj.random,0),
        //                 y: this.calc_property(particle.y.from,spr_obj.random,0),
        //                 w: this.calc_property(particle.w.from,spr_obj.random,0),
        //                 h: this.calc_property(particle.h.from,spr_obj.random,0),
        //                 r: this.calc_property(particle.r.from,spr_obj.random,0),
        //                 a: this.calc_property(particle.a.from,spr_obj.random,0),
        //             };
        //             spr_obj.to = {
        //                 x: this.calc_property(particle.x.to,spr_obj.random,0),
        //                 y: this.calc_property(particle.y.to,spr_obj.random,0),
        //                 w: this.calc_property(particle.w.to,spr_obj.random,0),
        //                 h: this.calc_property(particle.h.to,spr_obj.random,0),
        //                 r: this.calc_property(particle.r.to,spr_obj.random,0),
        //                 a: this.calc_property(particle.a.to,spr_obj.random,0),
        //             };

        //             spr_obj.sprite.texture = this.particle_textures[particle.sprite];

        //             spr_obj.sprite.tint = this.hex_to_tint(particle.color);
        //             if(do_break){
        //                 break;
        //             }
        //         }

        //         let t = elapsed_time/(prtc_obj.duration*particle.duration)*(1-particle.start) + particle.start;// 経過時間 / 持続時間 * (1 - 開始値) + 開始値
                
        //         let x = this.calc_property_with_ease(t, spr_obj.from.x, spr_obj.to.x, particle.x.ease);
        //         let y = this.calc_property_with_ease(t, spr_obj.from.y, spr_obj.to.y, particle.y.ease);
        //         let w = this.calc_property_with_ease(t, spr_obj.from.w, spr_obj.to.w, particle.w.ease);
        //         let h = this.calc_property_with_ease(t, spr_obj.from.h, spr_obj.to.h, particle.h.ease);
        //         let r = this.calc_property_with_ease(t, spr_obj.from.r, spr_obj.to.r, particle.r.ease);
        //         let a = this.calc_property_with_ease(t, spr_obj.from.a, spr_obj.to.a, particle.a.ease);
        //         spr_obj.sprite.alpha = a;

        //         let [x1,y1,x2,y2,x3,y3,x4,y4] = this.calc_particle_positon(
        //             prtc_obj.anchor.x1,
        //             prtc_obj.anchor.y1,
        //             prtc_obj.anchor.x2,
        //             prtc_obj.anchor.y2,
        //             prtc_obj.anchor.x3,
        //             prtc_obj.anchor.y3,
        //             prtc_obj.anchor.x4,
        //             prtc_obj.anchor.y4,
        //             x,y,w,h,r
        //         );
        //         if(this.vertices == -1){
        //             spr_obj.sprite.proj.mapSprite(spr_obj.sprite,[
        //                 new PIXI.Point(x2,y2),
        //                 new PIXI.Point(x3,y3),
        //                 new PIXI.Point(x4,y4),
        //                 new PIXI.Point(x1,y1),
        //             ]);
        //         }else{
        //             let uvs = spr_obj.sprite.geometry.buffers[0].data;
        //             let t = 0;
        //             for (let i = 0; i < this.vertices; i++) {
        //                 t = i/(this.vertices-1);
        //                 let sx = (x1-x2)*t+x2; let sy = (y1-y2)*t+y2;
        //                 let ex = (x4-x3)*t+x3; let ey = (y4-y3)*t+y3;
        //                 for (let j = 0; j < this.vertices; j++) {
        //                     t = j/(this.vertices-1);
        //                     uvs[i*this.vertices*2+j*2] = (ex-sx)*t+sx;
        //                     uvs[i*this.vertices*2+j*2+1] = (ey-sy)*t+sy;
        //                 }
        //             }
        //             spr_obj.sprite.geometry.buffers[0].update();
        //         }
        //         spr_obj.sprite.visible = true;
        //     }
        // }
    }

    calc_property_with_ease(t, from, to, ease){
        if(ease){
            return (to-from)*this.ease_function(ease,t)+from;
        }else{
            return (to-from)*t+from;
        }
    }

    calc_particle_positon(x1,y1,x2,y2,x3,y3,x4,y4,x,y,w,h,r){
        //x1,y1,x2,y2,x3,y3,x4,y4は左上を(0,0)、右下を(C_width,C_height)とする座標系
        //x,yは左下を(-1,-1)、右上を(1,1)とする座標系

        //左下(-1,-1)と右上(1,1)の平面上の位置計算
        let tl_x = x - w; //左上のx座標
        let tl_y = y + h; //左上のy座標
        let tr_x = x + w; //右上のx座標
        let tr_y = y + h; //右上のy座標
        let bl_x = x - w; //左下のx座標
        let bl_y = y - h; //左下のy座標
        let br_x = x + w; //右下のx座標
        let br_y = y - h; //右下のy座標

        //回転(yがcanvasとsonolusで逆なので反転)
        let sinr = Math.sin(r);
        let cosr = Math.cos(r);
        let _tl_x = (tl_x - x) * cosr - (tl_y - y) * sinr + x;
        let _tr_x = (tr_x - x) * cosr - (tr_y - y) * sinr + x;
        let _bl_x = (bl_x - x) * cosr - (bl_y - y) * sinr + x;
        let _br_x = (br_x - x) * cosr - (br_y - y) * sinr + x;
        tl_y = (tl_x - x) * sinr + (tl_y - y) * cosr + y;
        tr_y = (tr_x - x) * sinr + (tr_y - y) * cosr + y;
        bl_y = (bl_x - x) * sinr + (bl_y - y) * cosr + y;
        br_y = (br_x - x) * sinr + (br_y - y) * cosr + y;
        tl_x = _tl_x;
        tr_x = _tr_x;
        bl_x = _bl_x;
        br_x = _br_x;

        //バイリニア変換
        let [_x1,_y1] = this.bilinear_interpolate(x1,y1,x2,y2,x3,y3,x4,y4,bl_x,bl_y);
        let [_x2,_y2] = this.bilinear_interpolate(x1,y1,x2,y2,x3,y3,x4,y4,tl_x,tl_y);
        let [_x3,_y3] = this.bilinear_interpolate(x1,y1,x2,y2,x3,y3,x4,y4,tr_x,tr_y);
        let [_x4,_y4] = this.bilinear_interpolate(x1,y1,x2,y2,x3,y3,x4,y4,br_x,br_y);

        
        return [_x1,_y1,_x2,_y2,_x3,_y3,_x4,_y4];
    } 

    bilinear_interpolate(x1,y1,x2,y2,x3,y3,x4,y4,x,y){
        //x1,y1,x2,y2,x3,y3,x4,y4は左上を(0,0)、右下を(C_width,C_height)とする座標系
        //x,yを左下を(-1,-1)、右上を(1,1)とする座標系から左上を(0,0)右下を(1,1)とする座標系に変換
        x = (x + 1) / 2;
        y = (1 - y) / 2;
        //平行線の計算
        let l_x = (x1 - x2) * y + x2;
        let l_y = (y1 - y2) * y + y2;
        let r_x = (x4 - x3) * y + x3;
        let r_y = (y4 - y3) * y + y3;
    
        return [//x,y
            (r_x - l_x) * x + l_x,
            (r_y - l_y) * x + l_y
        ];
    }

    sequential_order(entities,process,ignore_unrunnable_process = true){
        let entities_order = [];
        for(let id of entities){
            let archetype = this.archetypes[this.entities[id].archetype];
            if(process in archetype){//archetypeにこのprocessがなければ出力されるorderに記録されない。(ignore_unrunable_process = trueの時)
                if("order" in archetype[process]){
                    entities_order.push({
                        id:id,
                        order:archetype[process].order
                    });
                }else{
                    entities_order.push({
                        id:id,
                        order:0
                    });
                }
            }else if(!ignore_unrunnable_process){
                entities_order.push({
                    id:id,
                    order:Infinity//最後に持ってくるため
                });
            }
        }
        entities_order.sort((a,b) => a.order - b.order);
        if(ignore_unrunnable_process){
            return entities_order.map(obj => obj.id);
        }else{
            return entities_order.map(obj => [obj.id,obj.order != Infinity]);
        }
        
    }

    get_node_index_of_archetype(entity_id,process){
        let archetype = this.archetypes[this.entities[entity_id].archetype]
        if(process in archetype){
            return {
                enable: true,
                index: archetype[process].index
            };
        }else{
            return {
                enable: false,
                index: null
            };
        }
    }

    preprocess(){
        // this.can_write = {
        //     "RuntimeEnvironment":true,"RuntimeUpdate":false,"RuntimeTouchArray":false,"RuntimeSkinTransform":true,"RuntimeParticleTransform":true,"RuntimeBackground":true,"RuntimeUI":true,"RuntimeUIConfiguration":true,
        //     "LevelMemory":true,"LevelData":true,"LevelOption":false,"LevelBucket":true,"LevelScore":true,"LevelLife":true,
        //     "EngineRom":false,
        //     "EntityMemory":true,"EntityData":true,"EntitySharedMemory":true,"EntityInfo":false,"EntityDespawn":true,"EntityInput":true,
        //     "EntityDataArray":true,"EntitySharedMemoryArray":true,"EntityInfoArray":false,
        //     "ArchetypeLife":true,
        //     "TemporaryMemory":true,
        // };

        for(let index of this.sequential_order(Object.keys(this.entities),"preprocess")){
            index = Number(index);
            this.run_node(this.get_node_index_of_archetype(index,"preprocess").index,index);
        }
    }

    spawnOrder(){
        this.can_write = {
            "RuntimeEnvironment":false,"RuntimeUpdate":false,"RuntimeTouchArray":false,"RuntimeSkinTransform":false,"RuntimeParticleTransform":false,"RuntimeBackground":false,"RuntimeUI":false,"RuntimeUIConfiguration":false,
            "LevelMemory":false,"LevelData":false,"LevelOption":false,"LevelBucket":false,"LevelScore":false,"LevelLife":false,
            "EngineRom":false,
            "EntityMemory":true,"EntityData":false,"EntitySharedMemory":false,"EntityInfo":false,"EntityDespawn":true,"EntityInput":true,
            "EntityDataArray":false,"EntitySharedMemoryArray":false,"EntityInfoArray":false,
            "ArchetypeLife":false,
            "TemporaryMemory":true,
        };

        let result = [];
        for(let [entity_id,runnable] of this.sequential_order(Object.keys(this.entities),"spawnOrder",false)){
            entity_id = Number(entity_id);
            if(runnable){
                result.push({
                    value: this.run_node(this.get_node_index_of_archetype(entity_id,"spawnOrder").index,entity_id),
                    entity_id: entity_id,
                });
            }else{
                result.push({
                    value: 0,
                    entity_id: entity_id,
                });
            }
            
        }
        result.sort((a,b) => b.value - a.value);//順序を設定
        this.spawnQ = result.map((v) => v.entity_id);
        this.spawnQ_debug = result;
    }

    shouldSpawn(){
        //spawn orderと書き込みルールが同じなので、can_writeは代入しない。

        while(this.spawnQ.length){//スポーンキュー
            let index = this.spawnQ[this.spawnQ.length-1];
            let archetype = this.archetypes[this.entities[index].archetype];
            if("shouldSpawn" in archetype){
                let result = this.run_node(archetype.shouldSpawn.index,index);
                if(result){
                    this.active_entities.push(index);
                    this.init_entities.push(index);
                    this.spawnQ.pop();
                    this.blocks.EntityInfoArray[3*index+2] = 1;
                }else{
                    break;
                }
            }else{
                this.active_entities.push(index);
                this.init_entities.push(index);
                this.spawnQ.pop();
                this.blocks.EntityInfoArray[3*index+2] = 1;
            }
        }

        for(let index of this.spawnFQ){//スポーン関数キュー
            this.active_entities.push(index);
            this.init_entities.push(index);
            this.blocks.EntityInfoArray[3*index+2] = 1;
        }
        this.spawnFQ = [];

        this.blocks.EntityInfoArray[2] = 0;//なんかこれないと動かん
    }

    async initialize(){
        //should spawnと書き込みルールが同じなので、can_writeは代入しない。

        let result = [];
        for(let i of this.init_entities){//初期エンティティのみ
            result.push((async(index) => {
                index = Number(index);
                let archetype = this.archetypes[this.entities[index].archetype];
                if(archetype){
                    if("initialize" in archetype){
                        this.run_node(archetype.initialize.index,index);
                    }
                }else{
                    console.warn(`エンティティ${index}アーキタイプ${this.entities[index].archetype}はない`);
                }
                
            })(i));
        }
        await Promise.all(result);
        
        this.init_entities = [];//初期エンティティを更新しきったので空にする
    }

    updateSequential(){
        this.can_write = {
            "RuntimeEnvironment":false,"RuntimeUpdate":false,"RuntimeTouchArray":false,"RuntimeSkinTransform":true,"RuntimeParticleTransform":true,"RuntimeBackground":true,"RuntimeUI":false,"RuntimeUIConfiguration":false,
            "LevelMemory":true,"LevelData":false,"LevelOption":false,"LevelBucket":false,"LevelScore":false,"LevelLife":false,
            "EngineRom":false,
            "EntityMemory":true,"EntityData":false,"EntitySharedMemory":true,"EntityInfo":false,"EntityDespawn":true,"EntityInput":true,
            "EntityDataArray":false,"EntitySharedMemoryArray":true,"EntityInfoArray":false,
            "ArchetypeLife":false,
            "TemporaryMemory":true,
        };

        for(let index of this.sequential_order(this.active_entities,"updateSequential")){//生きてるエンティティのみ
            index = Number(index);
            this.run_node(this.get_node_index_of_archetype(index,"updateSequential").index,index);
        }
    }

    input_callback(){
        // this.update_touch();
        // this.blocks.RuntimeTouchArray = [];
        // this.touches.forEach((touch,i)=>{//RuntimeTouchArrayにデータを挿入
        //     touch.forEach((v,j)=>{
        //         this.blocks.RuntimeTouchArray[i*15+j] = v;
        //     });
        // });
        // this.blocks.RuntimeUpdate[3] = this.touches.length;

        if(this.touches.length > 0){
            //updateSequentialと書き込みルールが同じなので、can_writeは代入しない。
            for(let index of this.sequential_order(this.active_entities,"touch")){//生きてるエンティティのみ
                index = Number(index);
                this.run_node(this.get_node_index_of_archetype(index,"touch").index,index);
            }
        }
    }

    update_touch(){
        let touches = [];
        let delta_time = (performance.now() - this.before_touch_time)/1000;
        node_calc.set_block_val(0,1001,3,Object.keys(this.touch_pool).length);

        for(let [id,touch] of Object.entries(this.touch_pool)){
            //console.log(touch);
            let dx = (touch.x-touch.bx)/this.C_height*2;
            let dy = (touch.by-touch.y)/this.C_height*2;
            let vx = dx/delta_time;
            let vy = dy/delta_time;
            touches = [
                ...touches,
                Number(id),
                touch.start?1:0,touch.end?1:0,
                touch.t,touch.st,
                ...this.canvaspos2CCS(touch.x,touch.y),
                ...this.canvaspos2CCS(touch.sx,touch.sy),
                dx,dy,vx,vy,
                Math.sqrt(vx**2 + vy**2),
                Math.atan2(vy,vx)
            ];
            // if(touch.start){
            //     console.log(JSON.stringify(touch));
            // }

            if(touch.end){
                delete this.touch_pool[id];
            }else{
                touch.start = false;
                touch.bx = touch.x;
                touch.by = touch.y;
            }
            // console.log(touches);
        }
        this.before_touch_time = performance.now();

        //Runtime Touch Array
        node_calc.set_block_vals(1002,touches);
    }

    canvaspos2CCS(x,y){
        return [
            x/this.C_height*2-this.AspectRatio,
            1-y/this.C_height*2
        ];
    }

    async updateParallel(){
        this.can_write = {
            "RuntimeEnvironment":false,"RuntimeUpdate":false,"RuntimeTouchArray":false,"RuntimeSkinTransform":false,"RuntimeParticleTransform":false,"RuntimeBackground":false,"RuntimeUI":false,"RuntimeUIConfiguration":false,
            "LevelMemory":false,"LevelData":false,"LevelOption":false,"LevelBucket":false,"LevelScore":false,"LevelLife":false,
            "EngineRom":false,
            "EntityMemory":true,"EntityData":false,"EntitySharedMemory":false,"EntityInfo":false,"EntityDespawn":true,"EntityInput":true,
            "EntityDataArray":false,"EntitySharedMemoryArray":false,"EntityInfoArray":false,
            "ArchetypeLife":false,
            "TemporaryMemory":true,
        };
        let result = [];
        for(let i of this.active_entities){//生きてるエンティティのみ
            result.push((async(index) => {
                index = Number(index);
                let archetype = this.archetypes[this.entities[index].archetype];
                if("updateParallel" in archetype){
                    this.run_node(archetype.updateParallel.index,index);
                }
            })(i));
        }
        await Promise.all(result);
    }
    
    async despawning(){
        //updateParallelと書き込みルールが同じなので、can_writeは代入しない。
        
        let result = [];
        let despawnQ = [];
        for(let ent_i of this.active_entities){
            if(this.blocks.EntityDespawn[ent_i][0] != 0){
                despawnQ.push(ent_i);
            }
        }

        for(let i of despawnQ){//死ぬエンティティのみ
            result.push((async(index) => {
                index = Number(index);
                let archetype = this.archetypes[this.entities[index].archetype];
                if("terminate" in archetype){
                    let result = this.run_node(archetype.terminate.index,index);
                }
                this.active_entities = this.active_entities.filter(e => e != index);//破棄

                if(!this.entities[index].from_function){
                    this.blocks.EntityInfoArray[3*index+2] = 2;
                }
                

                //INPUT sequence
                if(archetype.hasInput && !this.entities[index].from_function){
                    let archetype_index = this.entities[index].archetype;
                    switch(this.blocks.EntityInput[index][0]){
                        case 0://miss
                            //jugdement
                            this.judge_cache.type = "miss";
                            this.judge_cache.start_time = performance.now();
                            this.judge_sprites.miss.visible = true;
                            this.judge_sprites.good.visible = false;                            
                            this.judge_sprites.great.visible = false;                            
                            this.judge_sprites.perfect.visible = false;     
                            //combo
                            this.combo = 0;
                            this.combo_update();
                            //health
                            this.health += this.blocks.ArchetypeLife[archetype_index*4+3] || 0;
                            //result
                            this.acc_result.miss++;
                            break;
                        case 1://perfect
                            this.judge_cache.type = "perfect";
                            this.judge_cache.start_time = performance.now();
                            this.judge_sprites.miss.visible = false;
                            this.judge_sprites.good.visible = false;                            
                            this.judge_sprites.great.visible = false;                            
                            this.judge_sprites.perfect.visible = true;     
                            //combo
                            this.combo++;
                            if(this.max_combo < this.combo){
                                this.max_combo = this.combo;
                            }
                            this.combo_update();  
                            //score
                            this.arcade_score += 1;
                            //health
                            this.health += this.blocks.ArchetypeLife[archetype_index*4] || 0;
                            //accuracy
                            this.accuracy_score += Math.max(1-Math.abs(this.blocks.EntityInput[index][1]),0);
                            //result
                            this.acc_result.perfect++;
                            break;     
                        case 2://great
                            this.judge_cache.type = "great";
                            this.judge_cache.start_time = performance.now();
                            this.judge_sprites.miss.visible = false;
                            this.judge_sprites.good.visible = false;                            
                            this.judge_sprites.great.visible = true;                            
                            this.judge_sprites.perfect.visible = false;     
                            //combo
                            this.combo++;
                            if(this.max_combo < this.combo){
                                this.max_combo = this.combo;
                            }
                            this.combo_update();
                            //score
                            this.arcade_score += this.blocks.LevelScore[1]/this.blocks.LevelScore[0];
                            //health
                            this.health += this.blocks.ArchetypeLife[archetype_index*4+1] || 0;
                            //accuracy
                            this.accuracy_score += Math.max(1-Math.abs(this.blocks.EntityInput[index][1]),0);
                            //result
                            this.acc_result.great++;
                            break;         
                        case 3://good
                            this.judge_cache.type = "good";
                            this.judge_cache.start_time = performance.now();
                            this.judge_sprites.miss.visible = false;
                            this.judge_sprites.good.visible = true;                            
                            this.judge_sprites.great.visible = false;                            
                            this.judge_sprites.perfect.visible = false;     
                            //combo
                            this.combo = 0;
                            this.combo_update();
                            //score
                            this.arcade_score += this.blocks.LevelScore[2]/this.blocks.LevelScore[0];
                            //health
                            this.health += this.blocks.ArchetypeLife[archetype_index*4+2] || 0;
                            //accuracy
                            this.accuracy_score += Math.max(1-Math.abs(this.blocks.EntityInput[index][1]),0);
                            //result
                            this.acc_result.good++;
                            break;       
                    }
                    //health
                    if(this.health < 0){
                        this.health = 0;
                    }
                    this.despawned_sprites++;
                }
            })(i));
        }
        await Promise.all(result);

        //skip
        if(this.despawned_sprites >= this.maximum_combo){
            if(this.BGM_ended){
                this.result_callback();
            }else{
                this.pause_button.texture = this.skip_button_tex;
                this.can_skip = true;
            }
        }
    }

    despawn_process(result){
        for(let step of result){
            this.health += step[1];
            this.accuracy_score += step[2];
            this.arcade_score += step[3];

            switch(step[0]){
                case 0://miss
                    //jugdement
                    this.judge_cache.type = "miss";
                    this.judge_cache.start_time = performance.now();
                    this.judge_sprites.miss.visible = true;
                    this.judge_sprites.good.visible = false;                            
                    this.judge_sprites.great.visible = false;                            
                    this.judge_sprites.perfect.visible = false; 
                    //combo
                    this.combo = 0;
                    this.combo_update();
                    //result
                    this.acc_result.miss++;
                    //bucket
                    if(this.bucket_values.length > step[4] && step[4] >= 0){
                        this.bucket_values[step[4]].miss.push(step[5]);
                    }else if(step[4] != -1){//-1のときはバケットに関与しない。
                        console.warn(`${step[4]} というバケットIDは存在しません。`);
                    }
                    break;
                case 1://perfect
                    //jugdement
                    this.judge_cache.type = "perfect";
                    this.judge_cache.start_time = performance.now();
                    this.judge_sprites.miss.visible = false;
                    this.judge_sprites.good.visible = false;                            
                    this.judge_sprites.great.visible = false;                            
                    this.judge_sprites.perfect.visible = true;     
                    //combo
                    this.combo++;
                    if(this.max_combo < this.combo){
                        this.max_combo = this.combo;
                    }
                    this.combo_update();  
                    //result
                    this.acc_result.perfect++;
                    //bucket
                    if(this.bucket_values.length > step[4] && step[4] >= 0){
                        this.bucket_values[step[4]].perfect.push(step[5]);
                    }else if(step[4] != -1){//-1のときはバケットに関与しない。
                        console.warn(`${step[4]} というバケットIDは存在しません。`);
                    }
                    break;
                case 2://great
                    //jugdement
                    this.judge_cache.type = "great";
                    this.judge_cache.start_time = performance.now();
                    this.judge_sprites.miss.visible = false;
                    this.judge_sprites.good.visible = false;                            
                    this.judge_sprites.great.visible = true;                            
                    this.judge_sprites.perfect.visible = false;     
                    //combo
                    this.combo++;
                    if(this.max_combo < this.combo){
                        this.max_combo = this.combo;
                    }
                    this.combo_update();
                    //result
                    this.acc_result.great++;
                    //bucket
                    if(this.bucket_values.length > step[4] && step[4] >= 0){
                        this.bucket_values[step[4]].great.push(step[5]);
                    }else if(step[4] != -1){//-1のときはバケットに関与しない。
                        console.warn(`${step[4]} というバケットIDは存在しません。`);
                    }
                    break;
                case 3://good
                    this.judge_cache.type = "good";
                    this.judge_cache.start_time = performance.now();
                    this.judge_sprites.miss.visible = false;
                    this.judge_sprites.good.visible = true;                            
                    this.judge_sprites.great.visible = false;                            
                    this.judge_sprites.perfect.visible = false;     
                    //combo
                    this.combo = 0;
                    this.combo_update();
                    //result
                    this.acc_result.good++;
                    //bucket
                    if(this.bucket_values.length > step[4] && step[4] >= 0){
                        this.bucket_values[step[4]].good.push(step[5]);
                    }else if(step[4] != -1){//-1のときはバケットに関与しない。
                        console.warn(`${step[4]} というバケットIDは存在しません。`);
                    }
                    break;   
                default:
                    console.error(`${step[0]}という判定番号は存在しません。`);
                    break;
            }

            if(this.health < 0){
                this.health = 0;
            }
            this.despawned_sprites++;
        }

        if(this.despawned_sprites >= this.maximum_combo){
            if(this.BGM_ended){
                this.result_callback();
            }else{
                this.pause_button.texture = this.skip_button_tex;
                this.can_skip = true;
            }
        }
    }

    combo_update(){
        if(this.combo > 0){
            this.comboVS.visible = this.comboTS.visible = true;
            this.comboVS.text = String(this.combo);
        }else{
            this.comboVS.visible = this.comboTS.visible = false;
            this.comboVS.text = String("0");
        }
        
    }

    /*############################

        　　　　関数関係

    ############################*/

    // run_node(index,entity_id,first_running = false){
    //     try{
    //         if(index in this.nodes){
    //             let node = this.nodes[index];
    //             if("value" in node){
    //                 return node.value;
    //             }else{
    //                 if(node.func == "Break"){
    //                     let values = this.run_nodes(node.args,entity_id);
    //                     if(values instanceof Breaker){
    //                         return values;
    //                     }else{
    //                         return new Breaker(...values);//count,value
    //                     }
    //                 }else if(node.func == "Block"){
    //                     let result = this.run_node(node.args[0],entity_id);
    //                     if(result instanceof Breaker){
    //                         result.count_block();
    //                         if(result.breakable()){
    //                             return result.return_value;
    //                         }else{
    //                             return result;
    //                         }
    //                     }else{
    //                         return result;
    //                     }
    //                 }else if(this.functions_without_prerun.includes(node.func)){//事前実行不要
    //                     let result = this[node.func](entity_id,...node.args);
    //                     return result || 0;
    //                 }else if(this.functions.includes(node.func)){//事前実行必要
    //                     //事前実行  breakされていたときは、valuesがBreakerインスタンス
    //                     let values = this.run_nodes(node.args,entity_id);

    //                     if(values instanceof Breaker){
    //                         return values;
    //                     }else{
    //                         let result = this[node.func](entity_id,...values);
    //                         return result;
    //                     }
    //                 }else if(node.func.substr(0,4) == "Ease"){//イージング関数
    //                     let value = this.run_node(node.args[0],entity_id);
    //                     if(value instanceof Breaker){
    //                         return value;
    //                     }else{
    //                         return this.ease_function(node.func.substr(4),value);
    //                     }
    //                 }else{
    //                     console.error(`index:${index} Function called "${node.func}".`);
    //                     return 0;
    //                 }
    //             }
    //         }else{
    //             console.error(`The node is not exist at index:${index}.`);
    //             return 0;
    //         }
    //     }catch(e){
    //         // if(e instanceof Breaker){
    //         //     if(first_running){
    //         //         this.error_send("warnning",`Block外へbreakしようとしました。`);
    //         //         return 0;
    //         //     }else{
    //         //         throw e;
    //         //     }
                
    //         // }else{
    //         //     this.error_send("system error",e);
    //         //     return 0;
    //         // }
    //         console.error(e);
    //         return 0;
    //     }
    // }

    // run_nodes(indexes,entity_id){
    //     let values = [];
    //     for(let index of indexes){
    //         let result = this.run_node(index,entity_id);
    //         if(result instanceof Breaker){
    //             return result;
    //         }
    //         values.push(result);
    //     }
    //     return values;
    // }

    ease_function(name,x){
        if(name == "linear" || name  == "Linear"){
            return ease_func.linear(x);
        }else if(name == "none" || name == "None"){
            return 0;
        }else{
            if(name.substr(0,5) == "InOut" || name.substr(0,3) == "inOut"){
                name = name.substr(5);
                if(this.ease_functions.includes(name)){
                    if(x < 0.5){
                        return ease_func[`easeIn${name}`](x*2)*0.5;
                    }else{
                        return ease_func[`easeOut${name}`](x*2-1)*0.5+0.5;
                    }
                }else{ 
                    console.error(`"InOut${name}"というイージング関数は存在しません。`);
                    return 0; 
                }
            }else if(name.substr(0,5) == "OutIn" || name.substr(0,5) == "outIn"){
                name = name.substr(5);
                if(this.ease_functions.includes(name)){
                    if(x < 0.5){
                        return ease_func[`easeOut${name}`](x*2)*0.5;
                    }else{
                        return ease_func[`easeIn${name}`](x*2-1)*0.5+0.5;
                    }
                }else{ 
                    console.error(`"OutIn${name}"というイージング関数は存在しません。`);
                    return 0; 
                }
            }else if(name.substr(0,2) == "In" || name.substr(0,2) == "in"){
                name = name.substr(2);
                if(this.ease_functions.includes(name)){
                    return ease_func[`easeIn${name}`](x);
                }else{ 
                    console.error(`"In${name}"というイージング関数は存在しません。`);
                    return 0; 
                }
            }else if(name.substr(0,3) == "Out" || name.substr(0,3) == "out"){
                name = name.substr(3);
                if(this.ease_functions.includes(name)){
                    return ease_func[`easeOut${name}`](x);
                }else{ 
                    console.error(`"Out${name}"というイージング関数は存在しません。`);
                    return 0; 
                }
            
            }else{
                console.error(`"${name}"というイージング関数は存在しません。`);
                return 0; 
            }
        }
    }

    hex_to_tint(hex_color){
        if(hex_color.length == 7){
            return parseInt(hex_color.slice(1),16);
        }else if(hex_color.length == 4){
            return parseInt(
                hex_color.charAt(1)+hex_color.charAt(1)+
                hex_color.charAt(2)+hex_color.charAt(2)+
                hex_color.charAt(3)+hex_color.charAt(3)
            ,16);
        }else{
            console.error(`${hex_color} is not valit hex color`);
            return 0;
        }
    }

    /*############################

        　　　　　関数

    ############################*/

    // ExportValue(entity_id,index,value){
    //     return 0;
    //     //未実装
    // }

    // Negate(entity_id,value){
    //     return -value;
    // }

    // TimeToScaledTime(entity_id,time){
    //     for(let step of this.changing_TIMESCALE){
    //         if(time >= step.start_time && time <= (step.end_time || Infinity)){
    //             return step.TIMESCALE * time + step.offset;
    //         }
    //     }
    //     return time;//見つからなけれな等倍で返却
    // }
    
    // TimeToStartingScaledTime(entity_id,time){
    //     for(let step of this.changing_TIMESCALE){
    //         if(time >= step.start_time && time <= (step.end_time || Infinity)){
    //             return step.TIMESCALE * step.start_time + step.offset;
    //         }
    //     }
    //     return 0;
    // }

    // TimeToStartingTime(entity_id,time){
    //     for(let step of this.changing_TIMESCALE){
    //         if(time >= step.start_time && time <= (step.end_time || Infinity)){
    //             return step.start_time;
    //         }
    //     }
    //     return 0;
    // }

    // TimeToTimeScale(entity_id,time){
    //     for(let step of this.changing_TIMESCALE){
    //         if(time >= step.start_time && time <= (step.end_time || Infinity)){
    //             return step.TIMESCALE;
    //         }
    //     }
    //     return 1;
    // }

    // BeatToBPM(entity_id,beat){
    //     for(let step of this.changing_BPM){
    //         if(beat >= step.start_beat && beat <= (step.end_beat || Infinity)){
    //             return step.BPM;
    //         }
    //     }
    //     return this.init_BPM;
    // }

    // BeatToStartingBeat(entity_id,beat){
    //     for(let step of this.changing_BPM){
    //         if(beat >= step.start_beat && beat <= (step.end_beat || Infinity)){
    //             return step.start_beat;
    //         }
    //     }
    //     return 0;
    // }

    // BeatToStartingTime(entity_id,beat){
    //     for(let step of this.changing_BPM){
    //         if(beat >= step.start_beat && beat <= (step.end_beat || Infinity)){
    //             return step.start_time;
    //         }
    //     }
    //     return 0;
    // }

    // BeatToTime(entity_id,beat){
    //     return this.beat_to_time(beat);
    // }

    // Block(entity_id,body){//throw, try-catchを使ってbreakする。
    //     try{
    //         return this.run_node(body,entity_id);
    //     }catch(e){
    //         if(e instanceof Breaker){//Breakによるエラーもどき
    //             e.count_block();//Blockをカウント
    //             if(e.breakable()){//カウントが達したか
    //                 return e.return_value;
    //             }else{
    //                 throw e;
    //             }
    //         }else{//普通のエラー
    //             throw e;
    //         }
    //     }
    // }

    // Break(entity_id,count,value){
    //     count = this.run_node(count,entity_id);
    //     value = this.run_node(value,entity_id);
    //     throw new Breaker(count,value);
    // }

    // DecrementPost(entity_id,id,index){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     this.set_block_val(entity_id,id,index,org_val-1);
    //     return org_val - 1;
    // }

    // DecrementPostPointed(entity_id,id,index,offset){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     this.set_block_val(entity_id,pointed_id,pointed_index,org_val-1);
    //     return org_val - 1;
    // }

    // DecrementPostShifted(entity_id,id,x,y,s){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     this.set_block_val(entity_id,id,x + y * s,org_val-1);
    //     return org_val - 1;
    // }

    // DecrementPre(entity_id,id,index){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     this.set_block_val(entity_id,id,index,org_val-1);
    //     return org_val;
    // }

    // DecrementPrePointed(entity_id,id,index,offset){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     this.set_block_val(entity_id,pointed_id,pointed_index,org_val-1);
    //     return org_val;
    // }

    // DecrementPreShifted(entity_id,id,x,y,s){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     this.set_block_val(entity_id,id,x + y * s,org_val-1);
    //     return org_val;
    // }

    // IncrementPost(entity_id,id,index){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     this.set_block_val(entity_id,id,index,org_val+1);
    //     return org_val + 1;
    // }

    // IncrementPostPointed(entity_id,id,index,offset){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     this.set_block_val(entity_id,pointed_id,pointed_index,org_val+1);
    //     return org_val + 1;
    // }

    // IncrementPostShifted(entity_id,id,x,y,s){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     this.set_block_val(entity_id,id,x + y * s,org_val+1);
    //     return org_val + 1;
    // }

    // IncrementPre(entity_id,id,index){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     this.set_block_val(entity_id,id,index,org_val+1);
    //     return org_val;
    // }

    // IncrementPrePointed(entity_id,id,index,offset){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     this.set_block_val(entity_id,pointed_id,pointed_index,org_val+1);
    //     return org_val;
    // }

    // IncrementPreShifted(entity_id,id,x,y,s){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     this.set_block_val(entity_id,id,x + y * s,org_val+1);
    //     return org_val;
    // }
    
    // While(entity_id,test,body){//事前実行不要関数
    //     while(true){
    //         let test_result = this.run_node(test,entity_id);
    //         if(test_result instanceof Breaker){
    //             return test_result;
    //         }
    //         if(test_result){
    //             let result = this.run_node(body,entity_id);
    //             if(result instanceof Breaker){
    //                 return result;
    //             }
    //         }else{
    //             return 0;
    //         }
    //     }
    // }
    
    // DoWhile(entity_id,body,test){//事前実行不要関数
    //     while(true){
    //         let result = this.run_node(body,entity_id);
    //         if(result instanceof Breaker){
    //             return result;
    //         }
    //         let test_result = this.run_node(test,entity_id);
    //         if(test_result instanceof Breaker){
    //             return test_result;
    //         }
    //         if(!test_result){
    //             return 0;
    //         }
    //     }
    // }

    // Execute(entity_id,...i){//事前実行不要関数
    //     let values = this.run_nodes(i,entity_id);
    //     if(values instanceof Breaker){
    //         return values;
    //     }
    //     return values[values.length - 1];
    // }

    // Execute0(entity_id,...i){//事前実行不要関数
    //     let values = this.run_nodes(i,entity_id);
    //     if(values instanceof Breaker){
    //         return values;
    //     }
    //     return 0;
    // }

    // If(entity_id,x,t,f){//事前実行不要関数
    //     let condition = this.run_node(x,entity_id);
    //     if(condition instanceof Breaker){
    //         return condition;
    //     }
    //     if(condition){
    //         return this.run_node(t,entity_id);//breakerでもそのままreturn
    //     }else{
    //         return this.run_node(f,entity_id);//breakerでもそのままreturn
    //     }
    // }

    // Switch(entity_id,x,...cases){//事前実行不要関数
    //     let discriminant = this.run_node(x,entity_id);
    //     if(discriminant instanceof Breaker){
    //         return discriminant;
    //     }
    //     for(let i = 0;i<cases.length/2;i++){
    //         let test = this.run_node(cases[i*2],entity_id);
    //         if(test instanceof Breaker){
    //             return test;
    //         }
    //         if(test == discriminant){
    //             return this.run_node(cases[i*2+1],entity_id);//breakerでもそのままreturn
    //         }
    //     }
    //     return 0;
    // }

    // SwitchWithDefault(entity_id,x,...cases){//事前実行不要関数
    //     let def = cases.pop();

    //     let discriminant = this.run_node(x,entity_id);
    //     if(discriminant instanceof Breaker){
    //         return discriminant;
    //     }
    //     for(let i = 0;i<cases.length/2;i++){
    //         let test = this.run_node(cases[i*2],entity_id);
    //         if(test instanceof Breaker){
    //             return test;
    //         }
    //         if(test == discriminant){
    //             return this.run_node(cases[i*2+1],entity_id);//breakerでもそのままreturn
    //         }
    //     }
    //     return this.run_node(def,entity_id);//breakerでもそのままreturn
    // }

    // SwitchInteger(entity_id,discriminant,...cases){//事前実行不要関数
    //     discriminant = this.run_node(discriminant,entity_id);
    //     if(discriminant instanceof Breaker){
    //         return discriminant;
    //     }
    //     let x = Math.round(discriminant);
    //     if(x < 0 || x > cases.length-1){
    //         return 0;
    //     }
    //     return this.run_node(cases[x],entity_id);
    // }

    // SwitchIntegerWithDefault(entity_id,discriminant,...cases){//事前実行不要関数
    //     let def = cases.pop();

    //     discriminant = this.run_node(discriminant,entity_id);
    //     if(discriminant instanceof Breaker){
    //         return discriminant;
    //     }
    //     for(let [i,one_case] of Object.entries(cases)){
    //         if(i == discriminant){
    //             return this.run_node(one_case,entity_id);
    //         }
    //     }
    //     return this.run_node(def,entity_id);
        
    // }

    // Add(entity_id,...e){
    //     return e.reduce((a, x) => {return a + x;});
    // }

    // Subtract(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return a - x;},e[0]);
    // }

    // Multiply(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return a * x;},e[0]);
    // }

    // Divide(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return a / x;},e[0]);
    // }

    // modulo(n,d){
    //     return ((n % d) + d) % d;
    // }

    // Mod(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return this.modulo(a,x);},e[0]);
    // }

    // Rem(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return a % x;},e[0]);
    // }

    // Power(entity_id,...e){
    //     return e.slice(1).reduce((a, x) => {return a ** x;},e[0]);
    // }

    // Log(entity_id,x){
    //     return Math.log(x);
    // }

    // Equal(entity_id,a,b){
    //     return (a == b) ? 1 : 0;
    // }

    // NotEqual(entity_id,a,b){
    //     return (a != b) ? 1 : 0;
    // }

    // Greater(entity_id,a,b){
    //     return (a > b) ? 1 : 0;
    // }

    // GreaterOr(entity_id,a,b){
    //     return (a >= b) ? 1 : 0;
    // }

    // Less(entity_id,a,b){
    //     return (a < b) ? 1 : 0;
    // }

    // LessOr(entity_id,a,b){
    //     return (a <= b) ? 1 : 0;
    // }

    // And(entity_id,...e){//事前実行不要関数
    //     for(let i of e){
    //         let test = this.run_node(i,entity_id);
    //         if(test instanceof Breaker){
    //             return test;
    //         }
    //         if(!test){
    //             return 0;
    //         }
    //     }
    //     return 1;
    // }

    // Or(entity_id,...e){//事前実行不要関数
    //     for(let i of e){
    //         let test = this.run_node(i,entity_id);
    //         if(test instanceof Breaker){
    //             return test;
    //         }
    //         if(test){
    //             return 1;
    //         }
    //     }
    //     return 0;
    // }

    // Not(entity_id,x){
    //     return x ? 0 : 1;
    // }

    // Min(entity_id,a,b){
    //     return Math.min(a,b);
    // }

    // Max(entity_id,a,b){
    //     return Math.max(a,b);
    // }

    // Abs(entity_id,x){
    //     return Math.abs(x);
    // }

    // Sign(entity_id,x){
    //     return Math.sign(x);
    // }

    // Ceil(entity_id,x){
    //     return Math.ceil(x);
    // }

    // Floor(entity_id,x){
    //     return Math.floor(x);
    // }

    // Round(entity_id,x){
    //     return Math.round(x);
    // }

    // Frac(entity_id,x){
    //     return x % 1;
    // }

    // Trunc(entity_id,x){
    //     return Math.trunc(x);
    // }

    // Degree(entity_id,x){
    //     return x * ( 180 / Math.PI );
    // }

    // Radian(entity_id,x){
    //     return x * ( Math.PI / 180 );
    // }

    // Sin(entity_id,x){
    //     return Math.sin(x);
    // }

    // Cos(entity_id,x){
    //     return Math.cos(x);
    // }

    // Tan(entity_id,x){
    //     return Math.tan(x);
    // }

    // Sinh(entity_id,x){
    //     return Math.sinh(x);
    // }

    // Cosh(entity_id,x){
    //     return Math.cosh(x);
    // }

    // Tanh(entity_id,x){
    //     return Math.tanh(x);
    // }

    // Arcsin(entity_id,x){
    //     return Math.asin(x);
    // }

    // Arccos(entity_id,x){
    //     return Math.acos(x);
    // }

    // Arctan(entity_id,x){
    //     return Math.atan(x);
    // }

    // Arctan2(entity_id,x, y){
    //     return Math.atan2(y,x);
    // }

    // Clamp(entity_id,x, min, max){
    //     if(x < min){
    //         return min;
    //     }else if(x > max){
    //         return max;
    //     }else{
    //         return x;
    //     }
    // }

    // Lerp(entity_id,min,max,x){
    //     return min + (max - min) * x;
    // }

    // LerpClamped(entity_id,min, max, x){
    //     if(x < 0){
    //         return min;
    //     }else if(x > 1){
    //         return max;
    //     }else{
    //         return min + (max - min) * x;
    //     }
    // }

    // Unlerp(entity_id,min,max,x){
    //     return (x - min) / (max - min);
    // }

    // UnlerpClamped(entity_id,min, max, x){
    //     let y = (x - min) / (max - min);
    //     if(y < 0){
    //         return 0;
    //     }else if(y > 1){
    //         return 1;
    //     }else{
    //         return y;
    //     }
    // }

    // Remap(entity_id,min1,max1,min2,max2,x){
    //     return min2 + (max2 - min2) * (x - min1) / (max1 - min1);
    // }

    // RemapClamped(entity_id,min1,max1,min2,max2,x){
    //     let y = min2 + (max2 - min2) * (x - min1) / (max1 - min1)
    //     if(y < Math.min(min2,max2)){
    //         return Math.min(min2,max2);
    //     }else if(y > Math.max(min2,max2)){
    //         return Math.max(min2,max2)
    //     }else{
    //         return y;
    //     }
    // }

    // Smoothstep(entity_id,min,max,x){
    //     var x = Math.max(0, Math.min(1, (x-min)/(max-min)));
    //     return x*x*(3 - 2*x);
    // }

    // Random(entity_id,min,max){
    //     return Math.random() * (max - min) + min;
    // }

    // RandomInteger(entity_id,min,max){
    //     return Math.floor(Math.random() * (max - min) + min);
    // }

    // get_block_val(entity_id,id,i){
    //     try{
    //         let block = this.blocks[this.blocks_names[id]||""];
    //         if(block){
    //             switch(this.blocks_names[id]){
    //                 case "EntityMemory":
    //                     return this.blocks.EntityMemory[entity_id][i] || 0;
    //                 case "EntityDespawn":
    //                     return this.blocks.EntityDespawn[entity_id][i] || 0;
    //                 case "EntityInput":
    //                     return this.blocks.EntityInput[entity_id][i] || 0;
    //                 case "EntityData":
    //                     return this.blocks.EntityDataArray[entity_id*32+i] || 0;
    //                 case "EntitySharedMemory":
    //                     return this.blocks.EntitySharedMemoryArray[entity_id*32+i] || 0;
    //                 case "EntityInfo":
    //                     return this.blocks.EntityInfoArray[entity_id*3+i] || 0;
    //                 default:
    //                     return block[i] || 0;
    //             }
    //         }else{
    //             console.warn(`block:${this.blocks_names[id]}(${id})は存在しません。`);
    //             return 0;
    //         }
    //     }catch(e){
    //         console.warn(entity_id,id,i,e);
    //         return 0;
    //     }
    // }

    // set_block_val(entity_id,id,i,val){
    //     try{
    //         let block = this.blocks[this.blocks_names[id]];
    //         if(block){
    //             if(this.can_write[this.blocks_names[id]]){
    //                 switch(this.blocks_names[id]){
    //                     case "RuntimeBackground":
    //                         this.update_background = true;
    //                         break;
    //                     case "EntityMemory":
    //                         block[entity_id][i] = val;
    //                         break;
    //                     case "EntityDespawn":
    //                         block[entity_id][i] = val;
    //                         break;
    //                     case "EntityInput":
    //                         block[entity_id][i] = val;
    //                         break;
    //                     case "EntityData":
    //                         this.blocks.EntityDataArray[entity_id*32+i] = val;
    //                         break;
    //                     case "EntitySharedMemory":
    //                         this.blocks.EntitySharedMemoryArray[entity_id*32+i] = val;
    //                         break;
    //                     case "EntityInfo":
    //                         this.blocks.EntityInfoArray[entity_id*3+i] = val;
    //                         break;
    //                     default:
    //                         block[i] = val;
    //                         break;
    //                 }
    //             }else{
    //                 console.warn(`block:${this.blocks_names[id]}(${id})は書き込みを許可されていません。`);
    //             }

    //             // if ((typeof block) == "string"){
    //             //     switch(block){
    //             //         case "RuntimeBackground":
    //             //             this.set_background();
    //             //             break;
    //             //         case "Entity Info":
    //             //             if(i < 3 && !this.can_write[id]){
    //             //                 console.warn(`block:${id}は書き込みを許可されていません。`);
    //             //             }else{
    //             //                 this.blocks[10][3*entity_id+i] = val;
    //             //             }
    //             //             break;
    //             //         case "Entity Memory":
    //             //             if(i < 64 && !this.can_write[id]){
    //             //                 console.warn(`block:${id}は書き込みを許可されていません。`);
    //             //             }else{
    //             //                 this.blocks[13][entity_id][i] = val;
    //             //             }
    //             //             break;
    //             //         case "Entity Data":
    //             //             if(i < 32 && !this.can_write[id]){
    //             //                 console.warn(`block:${id}は書き込みを許可されていません。`);
    //             //             }else{
    //             //                 this.blocks[11][32*entity_id+i] = val;
    //             //             }
    //             //             break;
    //             //         case "Entity Input":
    //             //             if(i < 4 && !this.can_write[id]){
    //             //                 console.warn(`block:${id}は書き込みを許可されていません。`);
    //             //             }else{
    //             //                 this.blocks[14][entity_id][i] = val;
    //             //             }
    //             //             break;
    //             //         case "Entity Shared Memory":
    //             //             if(i < 32 && !this.can_write[id]){
    //             //                 console.warn(`block:${id}は書き込みを許可されていません。`);
    //             //             }else{
    //             //                 this.blocks[12][32*entity_id+i] = val;
    //             //             }
    //             //             break;
    //             //     }
    //             // }else{
    //             //     block[i] = val;
    //             //     if(id == 4){
    //             //         this.set_background();
    //             //     }
    //             //     if(id == 5 && i == 7){
    //             //         return 1;
    //             //     }
    //             //     if(id == 5 && i == 17){
    //             //         return 2;
    //             //     }
    //             // }
    //         }else{
    //             console.warn(`block:${id}は存在しません。`);
    //         }
    //     }catch(e){
    //         console.warn(entity_id,id,i,val,e);
    //     }
    //     return val;
    // }

    // Get(entity_id,id,i){
    //     return this.get_block_val(entity_id, id, i);
    // }

    // GetPointed(entity_id,id,index,offset){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     return this.get_block_val(entity_id, pointed_id, pointed_index);
    // }

    // GetShifted(entity_id,id,x,y,s){
    //     return this.get_block_val(entity_id, id, x + y * s);
    // }

    // Set(entity_id,id,index,value){
    //     return this.set_block_val(entity_id, id, index, value);
    // }

    // SetPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, value);
    // }

    // SetShifted(entity_id,id,x,y,s,value){
    //     return this.set_block_val(entity_id,id,x + y * s,value);
    // }

    // SetAdd(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val + value);
    // }

    // SetAddPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val + value);
    // }

    // SetAddShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val + value);
    // }

    // SetDivide(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val / value);
    // }

    // SetDividePointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val / value);
    // }

    // SetDivideShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val / value);
    // }

    // SetMod(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,this.modulo(org_val,value));
    // }

    // SetModPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index,this.modulo(org_val,value));
    // }

    // SetModShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,this.modulo(org_val,value));
    // }

    // SetMultiply(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val * value);
    // }

    // SetMultiplyPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val * value);
    // }

    // SetMultiplyShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val * value);
    // }

    // SetPower(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val ** value);
    // }

    // SetPowerPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val ** value);
    // }

    // SetPowerShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val ** value);
    // }

    // SetRem(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val % value);
    // }

    // SetRemPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val % value);
    // }

    // SetRemShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val % value);
    // }

    // SetSubtract(entity_id,id,index,value){
    //     let org_val = this.get_block_val(entity_id,id,index);
    //     return this.set_block_val(entity_id,id,index,org_val - value);
    // }

    // SetSubtractPointed(entity_id,id,index,offset,value){
    //     let pointed_id = this.get_block_val(entity_id,id,index);
    //     let pointed_index = this.get_block_val(entity_id,id,index+1) + offset;
    //     let org_val = this.get_block_val(entity_id,pointed_id,pointed_index);
    //     return this.set_block_val(entity_id, pointed_id, pointed_index, org_val - value);
    // }

    // SetSubtractShifted(entity_id,id,x,y,s,value){
    //     let org_val = this.get_block_val(entity_id,id,x + y * s);
    //     return this.set_block_val(entity_id,id,x + y * s,org_val - value);
    // }

    // transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,T){
    //     let _x1 = x1*(T.x1.x1||0) + x2*(T.x1.x2||0) + x3*(T.x1.x3||0) + x4*(T.x1.x4||0); 
    //     let _x2 = x1*(T.x2.x1||0) + x2*(T.x2.x2||0) + x3*(T.x2.x3||0) + x4*(T.x2.x4||0); 
    //     let _x3 = x1*(T.x3.x1||0) + x2*(T.x3.x2||0) + x3*(T.x3.x3||0) + x4*(T.x3.x4||0); 
    //     let _x4 = x1*(T.x4.x1||0) + x2*(T.x4.x2||0) + x3*(T.x4.x3||0) + x4*(T.x4.x4||0);  

    //     let _y1 = y1*(T.y1.y1||0) + y2*(T.y1.y2||0) + y3*(T.y1.y3||0) + y4*(T.y1.y4||0); 
    //     let _y2 = y1*(T.y2.y1||0) + y2*(T.y2.y2||0) + y3*(T.y2.y3||0) + y4*(T.y2.y4||0); 
    //     let _y3 = y1*(T.y3.y1||0) + y2*(T.y3.y2||0) + y3*(T.y3.y3||0) + y4*(T.y3.y4||0); 
    //     let _y4 = y1*(T.y4.y1||0) + y2*(T.y4.y2||0) + y3*(T.y4.y3||0) + y4*(T.y4.y4||0);  

    //     return [_x1, _y1, _x2, _y2, _x3, _y3, _x4, _y4];
    // }

    // transform_mat(x,y,ref_matrix = "RuntimeSkinTransform"){
    //     let m = this.blocks[ref_matrix];
    //     let _x = x*m[0] + y*m[1] + m[3];
    //     let _y = x*m[4] + y*m[5] + m[7];
    //     return [_x, _y];
    // }

    center2LT(x,y) {
        return [
            Math.round((x+this.AspectRatio)/2*this.C_height),
            Math.round((1-y)/2*this.C_height)
        ];
    }
    

    // draw_by_mesh(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a){
    //     if(id in this.textures){
    //         if(id in this.textures){
    //             [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         }
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));

    //         let last_sprite;
    //         for(let sprite of this.sprites[entity_id]){
    //             if(sprite){
    //                 if(sprite.id == id && sprite.num != this.now_num && sprite.type == "quad-mesh"){
    //                     last_sprite = sprite;
    //                     break;
    //                 }
    //             }
    //         }
    //         if(last_sprite){
    //             let sprite = last_sprite.sprite;

    //             let uvs = sprite.geometry.buffers[0].data;
    //             let t = 0;
    //             for (let i = 0; i < this.vertices; i++) {
    //                 t = i/(this.vertices-1);
    //                 let sx = (x1-x2)*t+x2; let sy = (y1-y2)*t+y2;
    //                 let ex = (x4-x3)*t+x3; let ey = (y4-y3)*t+y3;
    //                 for (let j = 0; j < this.vertices; j++) {
    //                     t = j/(this.vertices-1);
    //                     uvs[i*this.vertices*2+j*2] = (ex-sx)*t+sx;
    //                     uvs[i*this.vertices*2+j*2+1] = (ey-sy)*t+sy;
    //                 }
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             last_sprite.num = this.now_num;
    //         }else{
    //             let sprite = new PIXI.SimplePlane(this.textures[id], this.vertices, this.vertices);

    //             let uvs = sprite.geometry.buffers[0].data;
    //             let t = 0;
    //             for (let i = 0; i < this.vertices; i++) {
    //                 t = i/(this.vertices-1);
    //                 let sx = (x1-x2)*t+x2; let sy = (y1-y2)*t+y2;
    //                 let ex = (x4-x3)*t+x3; let ey = (y4-y3)*t+y3;
    //                 for (let j = 0; j < this.vertices; j++) {
    //                     t = j/(this.vertices-1);
    //                     uvs[i*this.vertices*2+j*2] = (ex-sx)*t+sx;
    //                     uvs[i*this.vertices*2+j*2+1] = (ey-sy)*t+sy;
    //                 }
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             this.engine_stage.addChild(sprite);
    //             this.sprites[entity_id].push({
    //                 id:id,
    //                 sprite:sprite,
    //                 num:this.now_num,
    //                 type:"quad-mesh"
    //             });
    //         }
    //     }else{
    //         console.warn(`draw: texture:${id}は存在しません。`);
    //     }
    // }

    // draw_by_homography(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a){
    //     if(id in this.textures){
    //         if(id in this.textures){
    //             [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         }
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));

    //         let last_sprite;
    //         for(let sprite of this.sprites[entity_id]){
    //             if(sprite){
    //                 if(sprite.id == id && sprite.num != this.now_num && sprite.type == "quad-homo"){
    //                     last_sprite = sprite;
    //                     break;
    //                 }
    //             }
    //         }
    //         if(last_sprite){
    //             let sprite = last_sprite.sprite;

    //             let anchor_pos =  last_sprite.anchors;
    //             anchor_pos[0].set(x2,y2);
    //             anchor_pos[1].set(x3,y3);
    //             anchor_pos[2].set(x4,y4);
    //             anchor_pos[3].set(x1,y1);
    //             sprite.proj.mapSprite(sprite,anchor_pos);

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             last_sprite.num = this.now_num;
    //         }else{
    //             let sprite = new PIXI_pj.Sprite2d(this.textures[id]);
    //             sprite.anchor.set(0);

    //             const anchor_pos = [
    //                 new PIXI.Point(x2,y2),
    //                 new PIXI.Point(x3,y3),
    //                 new PIXI.Point(x4,y4),
    //                 new PIXI.Point(x1,y1),
    //             ];
    //             sprite.proj.mapSprite(sprite,anchor_pos);
        
    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             this.engine_stage.addChild(sprite);
    //             this.sprites[entity_id].push({
    //                 id:id,
    //                 sprite:sprite,
    //                 num:this.now_num,
    //                 anchors:anchor_pos,
    //                 type:"quad-homo"
    //             });
    //         }
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // Draw(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a){
    //     this.draw_by_mesh(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a);
    // }

    // draw_curved_LR(entity_id,id,Lcurv,Rcurv,z,a){//Lcurv,Rcurv: [index]{x: X座標, y: Y座標}
    //     if(id in this.textures){
    //         let n = Lcurv.length;
    //         let last_sprite;
    //         for(let sprite of this.sprites[entity_id]){
    //             if(sprite){
    //                 if(sprite.id == id && sprite.num != this.now_num && sprite.type == "curv_LR"){
    //                     last_sprite = sprite;
    //                     break;
    //                 }
    //             }
    //         }
    //         if(last_sprite){
    //             let sprite = last_sprite.sprite;

    //             let uvs = sprite.geometry.buffers[0].data;
    //             for (let y = 0; y < n; y++) {
    //                 for(let x = 0; x < this.curv_vertices; x++){
    //                     let t = x/(this.curv_vertices-1);
    //                     uvs[y*this.curv_vertices*2+x*2] = (Rcurv[y].x-Lcurv[y].x)*t+Lcurv[y].x;
    //                     uvs[y*this.curv_vertices*2+x*2+1] = (Rcurv[y].y-Lcurv[y].y)*t+Lcurv[y].y;
    //                 }
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             last_sprite.num = this.now_num;
    //         }else{
    //             let sprite = new PIXI.SimplePlane(this.textures[id], this.curv_vertices, n);

    //             let uvs = sprite.geometry.buffers[0].data;
    //             for (let y = 0; y < n; y++) {
    //                 for(let x = 0; x < this.curv_vertices; x++){
    //                     let t = x/(this.curv_vertices-1);
    //                     uvs[y*this.curv_vertices*2+x*2] = (Rcurv[y].x-Lcurv[y].x)*t+Lcurv[y].x;
    //                     uvs[y*this.curv_vertices*2+x*2+1] = (Rcurv[y].y-Lcurv[y].y)*t+Lcurv[y].y;
    //                 }
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             this.engine_stage.addChild(sprite);
    //             this.sprites[entity_id].push({
    //                 id:id,
    //                 sprite:sprite,
    //                 num:this.now_num,
    //                 type:"curv_LR"
    //             });
    //         }
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // draw_curved_TB(entity_id,id,Tcurv,Bcurv,z,a){//Tcurv,Bcurv: [index]{x: X座標, y: Y座標}
    //     if(id in this.textures){
    //         let n = Tcurv.length;
    //         let last_sprite;
    //         for(let sprite of this.sprites[entity_id]){
    //             if(sprite){
    //                 if(sprite.id == id && sprite.num != this.now_num && sprite.type == "curv_TB"){
    //                     last_sprite = sprite;
    //                     break;
    //                 }
    //             }
    //         }
    //         if(last_sprite){
    //             let sprite = last_sprite.sprite;

    //             let uvs = sprite.geometry.buffers[0].data;
    //             for (let i = 0; i < n; i++) {
    //                 uvs[i*2] = Tcurv[i].x;
    //                 uvs[i*2+1] = Tcurv[i].y;
    //                 uvs[i*2+n*2] = Bcurv[i].x;
    //                 uvs[i*2+n*2+1] = Bcurv[i].y;
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             last_sprite.num = this.now_num;
    //         }else{
    //             let sprite = new PIXI.SimplePlane(this.textures[id], n, 2);

    //             let uvs = sprite.geometry.buffers[0].data;
    //             for (let i = 0; i < n; i++) {
    //                 uvs[i*2] = Tcurv[i].x;
    //                 uvs[i*2+1] = Tcurv[i].y;
    //                 uvs[i*2+n*2] = Bcurv[i].x;
    //                 uvs[i*2+n*2+1] = Bcurv[i].y;
    //             }
    //             sprite.geometry.buffers[0].update();

    //             sprite.zIndex = z;
    //             sprite.alpha = a;
    //             this.engine_stage.addChild(sprite);
    //             this.sprites[entity_id].push({
    //                 id:id,
    //                 sprite:sprite,
    //                 num:this.now_num,
    //                 type:"curv_TB"
    //             });
    //         }
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedL(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxL,cyL){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxL,cyL] = this.center2LT(...this.transform_mat(cxL,cyL));

    //         let Lcurv = [];
    //         let Rcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Lcurv.push({
    //                 x: ((1-t)**2)*x2 + 2*(1-t)*t*cxL + (t**2)*x1,
    //                 y: ((1-t)**2)*y2 + 2*(1-t)*t*cyL + (t**2)*y1,
    //             });
    //             Rcurv.push({
    //                 x: (x4-x3)*t+x3,
    //                 y: (y4-y3)*t+y3,
    //             });
    //         }

    //         this.draw_curved_LR(entity_id,id,Lcurv,Rcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedR(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxR,cyR){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxR,cyR] = this.center2LT(...this.transform_mat(cxR,cyR));

    //         let Lcurv = [];
    //         let Rcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Lcurv.push({
    //                 x: (x1-x2)*t+x2,
    //                 y: (y1-y2)*t+y2,
    //             });
    //             Rcurv.push({
    //                 x: ((1-t)**2)*x3 + 2*(1-t)*t*cxR + (t**2)*x4,
    //                 y: ((1-t)**2)*y3 + 2*(1-t)*t*cyR + (t**2)*y4,
    //             });
    //         }

    //         this.draw_curved_LR(entity_id,id,Lcurv,Rcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedLR(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxL,cyL,cxR,cyR){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxL,cyL] = this.center2LT(...this.transform_mat(cxL,cyL));
    //         [cxR,cyR] = this.center2LT(...this.transform_mat(cxR,cyR));

    //         let Lcurv = [];
    //         let Rcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Lcurv.push({
    //                 x: ((1-t)**2)*x2 + 2*(1-t)*t*cxL + (t**2)*x1,
    //                 y: ((1-t)**2)*y2 + 2*(1-t)*t*cyL + (t**2)*y1,
    //             });
    //             Rcurv.push({
    //                 x: ((1-t)**2)*x3 + 2*(1-t)*t*cxR + (t**2)*x4,
    //                 y: ((1-t)**2)*y3 + 2*(1-t)*t*cyR + (t**2)*y4,
    //             });
    //         }

    //         this.draw_curved_LR(entity_id,id,Lcurv,Rcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedT(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxT,cyT){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxT,cyT] = this.center2LT(...this.transform_mat(cxT,cyT));

    //         let Tcurv = [];
    //         let Bcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Tcurv.push({
    //                 x: ((1-t)**2)*x2 + 2*(1-t)*t*cxT + (t**2)*x3,
    //                 y: ((1-t)**2)*y2 + 2*(1-t)*t*cyT + (t**2)*y3,
    //             });
    //             Bcurv.push({
    //                 x: (x4-x1)*t+x1,
    //                 y: (y4-y1)*t+y1,
    //             });
    //         }

    //         this.draw_curved_TB(entity_id,id,Tcurv,Bcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedB(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxB,cyB){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxB,cyB] = this.center2LT(...this.transform_mat(cxB,cyB));

    //         let Tcurv = [];
    //         let Bcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Tcurv.push({
    //                 x: (x3-x2)*t+x2,
    //                 y: (y3-y2)*t+y2,
    //             });
    //             Bcurv.push({
    //                 x: ((1-t)**2)*x1 + 2*(1-t)*t*cxB + (t**2)*x4,
    //                 y: ((1-t)**2)*y1 + 2*(1-t)*t*cyB + (t**2)*y4,
    //             });
    //         }

    //         this.draw_curved_TB(entity_id,id,Tcurv,Bcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // DrawCurvedBT(entity_id,id,x1,y1,x2,y2,x3,y3,x4,y4,z,a,n,cxB,cyB,cxT,cyT){
    //     if(id in this.textures){
    //         [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.tex_transforms[id]);
    //         [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
    //         [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
    //         [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
    //         [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));
    //         [cxB,cyB] = this.center2LT(...this.transform_mat(cxB,cyB));
    //         [cxT,cyT] = this.center2LT(...this.transform_mat(cxT,cyT));

    //         let Tcurv = [];
    //         let Bcurv = [];
    //         for(let i = 0;i < n;i++){
    //             let t = i/(n-1);
    //             Tcurv.push({
    //                 x: ((1-t)**2)*x2 + 2*(1-t)*t*cxT + (t**2)*x3,
    //                 y: ((1-t)**2)*y2 + 2*(1-t)*t*cyT + (t**2)*y3,
    //             });
    //             Bcurv.push({
    //                 x: ((1-t)**2)*x1 + 2*(1-t)*t*cxB + (t**2)*x4,
    //                 y: ((1-t)**2)*y1 + 2*(1-t)*t*cyB + (t**2)*y4,
    //             });
    //         }

    //         this.draw_curved_TB(entity_id,id,Tcurv,Bcurv,z,a);
    //     }else{
    //         console.warn(`draw texture:${id}は存在しません。`);
    //     }
    // }

    // Play(entity_id,id,dist){
    //     dist = dist * 1000;

    //     if(id in this.effect_object){
    //         let now = performance.now() - this.start_time;
    //         this.effect_schedule[id].forEach((schedule,_)=>{
    //             if(Math.abs(now - schedule.time) < dist){
    //                 return 0;
    //             }
    //         });
    //         this.effect_schedule[id].push({time:now, looped: false});
    //     }else{
    //         console.warn(`effect:${id}は存在しません。`);
    //     }
    // }

    // PlayScheduled(entity_id,id,t,dist){
    //     t = t * 1000;
    //     dist = dist * 1000;

    //     if(id in this.effect_object){
    //         this.effect_schedule[id].forEach((schedule,_)=>{
    //             if(Math.abs(t - schedule.time) < dist){
    //                 return 0;
    //             }
    //         });
    //         this.effect_schedule[id].push({time:t, looped: false});
    //     }else{
    //         console.warn(`effect:${id}は存在しません。`);
    //     }
    // }

    // PlayLooped(entity_id,id){
    //     if(id in this.effect_object){
    //         let now = performance.now() - this.start_time;
    //         let loop_id = this.loop_id_generated;
    //         this.loop_id_generated++;
    //         this.effect_schedule[id].push({time:now, looped:true, loop_id:loop_id});
    //         return loop_id;
    //     }else{
    //         console.warn(`effect:${id}は存在しません。`);
    //     }
    // }

    // PlayLoopedScheduled(entity_id,id,t){
    //     t = t * 1000;
    //     if(id in this.effect_object){
    //         let loop_id = this.loop_id_generated;
    //         this.loop_id_generated++;
    //         this.effect_schedule[id].push({time:t, looped: true, loop_id:loop_id});
    //     }else{
    //         console.warn(`effect:${id}は存在しません。`);
    //     }
    //     return 0;
    // }

    // StopLooped(entity_id,loop_id){
    //     let now = performance.now() - this.start_time;
    //     this.effect_loop_end_schedule.push({time:now, loop_id:loop_id});
    //     return 0;
    // }

    // StopLoopedScheduled(entity_id,loop_id,t){
    //     t = t * 1000;
    //     this.effect_loop_end_schedule.push({time:t, loop_id:loop_id});
    //     return 0;
    // }

    // Spawn(entity_id,id,...data){

    //     let ent_id = this.entities.length;
    //     this.spawnFQ.push(ent_id);
    //     this.entities.push({archetype:id, from_function: true});
    //     // this.blocks[10][3*ent_id] = ent_id;
    //     // this.blocks[10][3*ent_id+1] = -1;
    //     // this.blocks[10][3*ent_id+2] = 0;
    //     this.blocks.EntityMemory.push(data);
    //     this.blocks.EntityDespawn.push([0]);
    //     this.sprites.push([]);
    // }

    generate_random(){
        return [
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
        ];
    }

    calc_property(exp,r,init){
        if(exp){
            let value = 0;
            if("c" in exp){
                value += exp.c;
            }
            for(let i = 0;i<8;i++){
                if(`r${i+1}` in exp){
                    value += exp[`r${i+1}`] * r[i];
                }
                if(`sinr${i+1}` in exp){
                    value += exp[`sinr${i+1}`] * Math.sin(2*Math.PI*r[i]);
                }
                if(`cosr${i+1}` in exp){
                    value += exp[`cosr${i+1}`] * Math.cos(2*Math.PI*r[i]);
                }
            }
            return value;
        }else{
            return init;
        }
    }

    SpawnParticleEffect(id,x1,y1,x2,y2,x3,y3,x4,y4,t,loop,unique_id){
        // if(id in this.particle_effects){

        // [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.particle_transforms[id]);
        // [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
        // [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
        // [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
        // [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));

        let now_time = performance.now();
        let prtc_obj = {
            effect: id,
            duration: t*1000,
            loop: !!loop,
            start_time:now_time,
            anchor:{
                x1:x1, x2:x2, x3:x3, x4:x4,
                y1:y1, y2:y2, y3:y3, y4:y4,
            },
            sprites:[],
        };

        this.particle_effects[id].forEach((group,grp_i) => {
            for (let ins_i = 0; ins_i<group.count; ins_i++){
                let rand = this.generate_random();
                group.particles.forEach((particle,prtc_i) => {
                    let sprite = new PIXI.SimplePlane(this.particle_textures[particle.sprite],this.vertices,this.vertices);
                    sprite.tint = this.hex_to_tint(particle.color);
                    sprite.visible = false;
                    sprite.zIndex = 2000;
                    this.engine_stage.addChild(sprite);

                    prtc_obj.sprites.push({
                        sprite: sprite,
                        group_index: grp_i,
                        particle_index: prtc_i,
                        from:{
                            x: this.calc_property(particle.x.from,rand,0),
                            y: this.calc_property(particle.y.from,rand,0),
                            w: this.calc_property(particle.w.from,rand,0),
                            h: this.calc_property(particle.h.from,rand,0),
                            r: this.calc_property(particle.r.from,rand,0),
                            a: this.calc_property(particle.a.from,rand,0),
                        },
                        to:{
                            x: this.calc_property(particle.x.to,rand,0),
                            y: this.calc_property(particle.y.to,rand,0),
                            w: this.calc_property(particle.w.to,rand,0),
                            h: this.calc_property(particle.h.to,rand,0),
                            r: this.calc_property(particle.r.to,rand,0),
                            a: this.calc_property(particle.a.to,rand,0),
                        },
                        random:rand
                    });
                });
            }
        });

        this.particles[unique_id] = prtc_obj;
        return unique_id;
        
        
        
        // for (let grp_i in this.particle_effects[id]){
        //     grp_i = Number(grp_i);
        //     let group = this.particle_effects[id][grp_i];
        //     for (let i = 0;i<group.count;i++){
        //         if(particle.sprite in this.particle_textures){
        //             let rand = this.generate_random();
        //             let sprite;
        //             if(this.vertices == -1){
        //                 sprite = new PIXI_pj.Sprite2d(this.particle_textures[particle.sprite]);
        //             }else{
        //                 sprite = new PIXI.SimplePlane(this.particle_textures[particle.sprite],this.vertices,this.vertices);
        //             }
        //             sprite.tint = this.hex_to_tint(particle.color);
        //             sprite.visible = false;
        //             sprite.zIndex = 2000;
                    
        //             this.engine_stage.addChild(sprite);
    
        //             prtc_obj.sprites.push({
        //                 sprite: sprite,
        //                 group_index: grp_i,
        //                 particle_index: 0,
        //                 start_time: now_time,
        //                 from:{
        //                     x: this.calc_property(particle.x.from,rand,0),
        //                     y: this.calc_property(particle.y.from,rand,0),
        //                     w: this.calc_property(particle.w.from,rand,0),
        //                     h: this.calc_property(particle.h.from,rand,0),
        //                     r: this.calc_property(particle.r.from,rand,0),
        //                     a: this.calc_property(particle.a.from,rand,0),
        //                 },
        //                 to:{
        //                     x: this.calc_property(particle.x.to,rand,0),
        //                     y: this.calc_property(particle.y.to,rand,0),
        //                     w: this.calc_property(particle.w.to,rand,0),
        //                     h: this.calc_property(particle.h.to,rand,0),
        //                     r: this.calc_property(particle.r.to,rand,0),
        //                     a: this.calc_property(particle.a.to,rand,0),
        //                 },
        //                 random:rand
        //             });
        //         }
        //     }
        // }
        // }else{
        //     console.warn(`particle:${id}は存在しません。`);
        // }
    }

    MoveParticleEffect(id,x1,y1,x2,y2,x3,y3,x4,y4){
        // if(id in this.particles){
        let particle = this.particles[id];

        // [x1,y1,x2,y2,x3,y3,x4,y4] = this.transform_tex(x1,y1,x2,y2,x3,y3,x4,y4,this.particle_transforms[particle.effect]);
        // [x1,y1] = this.center2LT(...this.transform_mat(x1,y1));
        // [x2,y2] = this.center2LT(...this.transform_mat(x2,y2));
        // [x3,y3] = this.center2LT(...this.transform_mat(x3,y3));
        // [x4,y4] = this.center2LT(...this.transform_mat(x4,y4));

        particle.anchor = {
            x1:x1, x2:x2, x3:x3, x4:x4,
            y1:y1, y2:y2, y3:y3, y4:y4,
        };
        // }else{
        //     console.warn(`particle identifier:${id}は存在しません。`);
        // }
    }

    DestroyParticleEffect(id){
        // if(id in this.particles){
        for(let sprite of this.particles[id].sprites){
            sprite.sprite.destroy();
        }
        delete this.particles[id];
        // }else{
        //     console.warn(`particle identifier:${id}は存在しません。`);
        // }
    }

    // HasSkinSprite(entity_id,id){
    //     return id in this.textures ? 1 : 0;
    // }

    // HasEffectClip(entity_id,id){
    //     return id in this.effect_data ? 1 : 0;
    // }

    // HasParticleEffect(entity_id,id){
    //     return id in this.particle_effects ? 1 : 0;
    // }

    // Judge(entity_id,target,source,min1,max1,min2,max2,min3,max3){
    //     let param = source - target;
    //     if(param <= max1 && param >= min1){
    //         return 1;
    //     }else if(param <= max2 && param >= min2){
    //         return 2;
    //     }else if(param <= max3 && param >= min3){
    //         return 3;
    //     }else{
    //         return 0;
    //     }
    // }

    // JudgeSimple(entity_id,target,source,max1,max2,max3){
    //     let param = source - target;
    //     if(param <= max1 && param >= -max1){
    //         return 1;
    //     }else if(param <= max2 && param >= -max2){
    //         return 2;
    //     }else if(param <= max3 && param >= -max3){
    //         return 3;
    //     }else{
    //         return 0;
    //     }
    // }

    // IsDebug(entity_id){
    //     return this.debug ? 1 : 0;
    // }

    // DebugPause(entity_id){
    //     if(this.debug){
    //         this.pause();
    //         return 0;
    //     }
    // }

    // DebugLog(entity_id,x){
    //     if(this.debug){
    //         console.log(`debug log: ${x}`);
    //         return 0;
    //     }
    // }
}