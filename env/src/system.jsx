import React from "react";
import { createRoot } from 'react-dom/client';
import Dexie from "dexie";
import * as PIXI from "pixi.js";
import $ from "jquery";
// import * as Gzip from "./zlib/gunzip.min.js";
// import * as Zip from "./zlib/unzip.min.js";
// import { Unzip, Gunzip } from "zlib";
const Gunzip = window.Zlib.Gunzip;
const Unzip = window.Zlib.Unzip;
import { Howl } from "howler";

import I18n from "./i18n.js";
import { Engine } from "./engine.js";
import * as node_calc from "./as/build/node_calc";
import { v4 as uuidv4 } from 'uuid';

window.node_calc = node_calc;

function plural2singular(plural){
    const singulars = {
        "authentications":"authentication",
        "multiplayers":"multiplayer",
        "posts":"post",
        "playlists":"playlist",
        "levels":"level",
        "skins":"skin",
        "backgrounds":"background",
        "effects":"effect",
        "particles":"particle",
        "engines":"engine",
        "replays":"replay",
        "rooms":"room",
        "configurations":"configuration"
    };
    return singulars[plural];
}

function singular2plural(singular){
    const plurals = {
        "authentication":"authentications",
        "multiplayer":"multiplayers",
        "post":"posts",
        "playlist":"playlists",
        "level":"levels",
        "skin":"skins",
        "background":"backgrounds",
        "effect":"effects",
        "particle":"particles",
        "engine":"engines",
        "replay":"replays",
        "room":"rooms",
        "configuration":"configurations"
    };
    return plurals[singular];
}

/*##################
#######メニュー#####
##################*/
export class Menu extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            menu_scene:"LoadingLocalization",
            visible: true,
            increment:0
        };
        this.menu_route = ["LoadingLocalization"];
    }

    render(){
        if(this.state.visible){
            switch(this.state.menu_scene){//returnされた時点でswitch文は終わるのでbreakはなし
                case "LoadingLocalization":
                    return <h1>Loading Localization File...</h1>;
                case "Title":
                    return <Title C={this}></Title>;
                case "TOS":
                    return <TOS C={this}></TOS>;
                case "ServerMenu":
                    return <Server_Menu C={this}/>;
                case "AddServerMenu":
                    return <Add_Server_Menu C={this}/>;
                case "AddCollectionMenu":
                    return <Add_Collection_Menu C={this}/>;
                case "EditServerMenu":
                    return <Edit_Server_Menu C={this}/>;
                case "EditCollectionMenu":
                    return <Edit_Collection_Menu C={this}/>;
                case "ServerInfo":
                    return <Server_Info C={this}/>;
                case "ServerMore":
                    return <Server_More C={this}/>;
                case "LevelInfo":
                    return <Level_Info C={this}/>;
                case "LevelInfoOffline":
                    return <Level_Info_Offline C={this}/>;
                case "LevelOption":
                    return <Level_Option C={this}/>;
                case "ResultMenu":
                    return <Result_Menu C={this}/>;
                case "ItemInfo":
                    return <Item_Info C={this}/>;
                case "PostInfo":
                    return <Post_Info C={this}/>;
                case "PlayListInfo":
                    return <PlayList_info C={this}/>;
                case "SourceLoad":
                    return <Source_Load C={this}/>;
                case "OfflineMenu":
                    return <Offline_Menu C={this}/>;
                case "BucketMenu":
                    return <Bucket_Menu C={this}/>;
                default:
                    return this.Unknown_menu();
            }
        }else{
            return <></>;
        }
    }

    componentDidMount(){
        i18n.load_file().then(()=>{
            this.change_menu("Title","write");
            //this.change_menu("SourceLoad","write");
        }).catch(()=>{
            alert("ERROR: CANNOT LOAD LOCALIZATION FILE. PLEASE REFRESH THIS PAGE.");
        });
    }

    change_menu(menu_key,update_route="next"){
        this.setState({menu_scene:menu_key});
        switch(update_route){
            case "next":
                if(this.menu_route[this.menu_route.length-2] == menu_key){//メニューが戻ってる場合
                    this.menu_route.pop();
                }else{
                    this.menu_route.push(menu_key);
                }
                break;
            case "add":
                this.menu_route.push(menu_key);
                break;
            case "write":
                this.menu_route = [menu_key];
                break;
            default:
                break;
        }
        console.log(this.menu_route);
    }

    back_menu(step = 1){
        let before_menu = this.menu_route[this.menu_route.length-step-1];//現在いるメニューも飛ばすため、-1 をする
        this.setState({menu_scene:before_menu});
        this.menu_route = this.menu_route.slice(0,step*-1);//飛ばした分を消す
        console.log(this.menu_route);
        return before_menu;
    }

    render_menu(){
        this.setState({increment:new Date().getTime()});
    }

    Unknown_menu(){
        return <h1>{i18n.translator("不明なメニュー")}</h1>;
    }

    change_visible(visible){
        this.setState({visible:visible});
    }
}

class Title extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
        <div id="title-div" >
            <h1 className="title">Sonolus Web Player</h1>
            <div id="start-trig" onClick={async()=>{
                $("#loading-cover").show();
                await preparation();
                C.change_menu("ServerMenu");
                $("#loading-cover").hide();
            }}>{t("スタート")}</div>
            <div className="TOStext">{t("スタートすると")}<a className="TOStag" onClick={()=>{
                C.change_menu("TOS");
            }}>{t("利用規約")}</a>{t("に同意したものとみなします。")}</div>
            <div className="feedback">{t("質問はDiscordへ")}: <a href="https://discordapp.com/users/951455786423439400">ponz8264</a></div>
            <div id="version">System Version: beta-0.2.0<br/>Sonolus Version: beta-0.8.11</div>
        </div>);
    }
}

const TOS = props => {
    return <div id="rule">
        <h2>{i18n.translator("利用規約")}</h2>
        <div className="content">
        ===用語の定義===<br/>
        ・「または」はすべて成り立つとは限らないことを指す語で、すべて成り立つ場合も含み、「および」の意も含む。<br/>
        ・「このウェブシステム」とは、https://1217pond.github.io/sonolus-web-player/ 以下の利用者がアクセス可能なファイルによって構築された、HTMLレンダリングエンジン上で実行されるシステムのこと。<br/>
        ・「スタートする」とは、このウェブシステムを実行して表示されるタイトルのプレイボタンを押すことを指す。<br/>
        ・管理者とは、このウェブシステムに対し、開発、運営、管理、またはそのほかの行為を行う、または行っていた者を指す。<br/>
        ・利用者とは、管理者を除き、このウェブシステムにアクセスしなんらかの電子計算機上で実行している者を指す。<br/>
        ・「外部サーバー」とは、サーバーアドレスと名前を入力することでこのウェブシステム上に登録できるSonolus custom serversを指す。<br/>
        ・「外部サービス」とは、このウェブシステムが利用しているこのウェブシステム以外のインターネット上のサービスを指す。<br/>
        ・「ソースデータ」とは、サーバー、楽曲、譜面(レベル)、スキン、背景、エフェクト、エンジン、パーティクルの内容・概要を指す。<br/>
        <br/>
        ===利用者が承諾しなればならない規約===<br/>
        1. 利用者がこのウェブシステムで、管理者の意図していない行為(*1)をすることを禁止する。<br/>
        2. このウェブシステムにより発生した直接損害・間接損害の責任の一切を管理者は負わないものとする。<br/>
        3. 外部サーバーから提供されるソースデータとは管理者は一切関与せず、利用者の自己責任としてデータが取得される。<br/>
        4. このウェブシステムは、フリーズ、クラッシュ、意図しない挙動、またはこれらによる利用者やこのウェブシステムが実行されているデバイスへの影響が発生する可能性があり、すべて利用者の自己責任となる。<br/>
        5. 外部サービスが、このウェブシステムによるインターネットの通信内容を傍受、記録、解析、利用、そのほかの行為をすることを利用者は承諾する。<br/>
        6. ある特定の利用者に対する、管理者の明確かつ具体的な許可により、上記の禁止されている行為のうち管理者によって許可された行為のみ、管理者はその特定の利用者が履行することを許す。<br/>
        7. 管理者はこのウェブシステム上で管理者の在住している国の法律および管理者の在住している国が批准している国際法の範囲内で可能なすべての行為を実行でき、それを利用者は許可する。<br/>
        8. 管理者はこの利用規約を利用者への通知なしに変更する可能性があり、利用規約の変更後に利用者がスタートした時点でその利用者は新たな利用規約に同意したものとみなされる。<br/>
        <br/>
        *1 以下の行為を指す。<br/>
        a. このウェブシステムの、ビューポート内の操作可能なオブジェクトの操作または、ビューポート内でのタッチパネルやマウス、キーボードなどの入力装置の操作(以下「管理者の意図した操作」と呼称する)以外を利用して、故意に、このウェブシステムの構造や変数などの状態の一部または全部が変更、削除、追加されるような操作をする行為(例：デバッカーツールなどを使いDOM要素を操作する行為、コンソールで変数を書き換える行為)<br/>
        b. 管理者の意図した操作以外を利用して、故意に、このウェブシステムが実行する処理、通信、その他の動作が、阻害、停止・中止、そのほかの管理者が意図するものではないと判断された挙動をするように操作する行為(例：コンソールの操作によりインターネット通信を改竄する行為)<br/>
        c. 管理者の意図した操作を利用しているかどうかに関係なく、故意に、管理者が正常ではないと判断した、または判断する動作を実行する行為(例：管理者がバグが発生すると判断した行為を故意に行う行為)<br/>
        d. 管理者の意図した操作を利用しているかどうかに関係なく、故意であるかどうかに関係なく、外部サービス、外部サーバーに対する、必要以上の負荷を与える行為、損害を与える行為、そのほかの悪意をもった行為(例：外部サーバーに通信を行うボタンを必要以上に押し、外部サーバーに必要以上の負荷を与える行為)<br/>
        e. 上記以外でも、管理者が、正常ではない、意図するものではない、または悪意のあるものであると、判断するまたは判断した行為
        </div>
        <a onClick={()=>{
            props.C.back_menu();
        }} className="text-trigger leave-TOS-trg">{i18n.translator("戻る")}</a>
    </div>;
}

async function preparation(){//前処理
    let master = (await db.servers.get("#master")) || {option:{system_option:{}}};//登録されていない場合
    let _so = master.option.system_option;
    console.log(_so);
    await db.servers.put({
        name: "#master",
        address:null,
        option:{
            system_option:{
                bgm_volume:_so.bgm_volume || 100,
                effect_volume:_so.effect_volume || 100,
                audio_offset:_so.audio_offset || 0,
                input_offset:_so.input_offset || 0,
                render_scale:_so.render_scale || 1,
                homography:_so.homography || false,
                mesh_vertexes:_so.mesh_vertexes || 3,
                curv_vertexes:_so.curv_vertexes || 3,
                max_fps:_so.max_fps || 0,
                texture_scale:_so.texture_scale || 0.5
            }
        },
        display_name:null,
        version:SERVER_VERSION
    });

    let collections = await db.collections.toArray();
    let should_delete_colls = [];
    collections.forEach(collection => {
        if((collection.version || 1) < COLLECTION_VERSION){
            should_delete_colls.push(collection.name);
        }
    });
    console.log("should delete colls:",should_delete_colls);
    await db.collections.bulkDelete(should_delete_colls);

    let servers = await db.servers.toArray();
    let should_delete_servs = [];
    servers.forEach(server => {
        if((server.version || 1) < SERVER_VERSION){
            should_delete_servs.push(server.name);
        }
    });
    console.log("should delete servs:",should_delete_servs);
    await db.servers.bulkDelete(should_delete_servs);
}

class Server_Menu extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = {
            Server_list: [],
            Collection_list: [],
        }
        TEMP.collection_list = {};
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div id="menu">
                <h3 className="Menu-title">{t("サーバー")}</h3>
                <h4 id="decache-trg" onClick={delete_cache}>{t("キャッシュ削除")}</h4>
                <div id="serv" className="selector-window">
                    {this.state.Server_list.map(v=><Server_Selector serv={v} C={C} key={v.name}></Server_Selector>)}
                    <a id="serv-adder" className="text-trigger" onClick={/*サーバー追加*/()=>C.change_menu("AddServerMenu")}>+ {t("サーバーを追加")}...</a>
                </div>
                <h3 className="Menu-title">{t("コレクション")}</h3>
                <div id="colec" className="selector-window">
                    {this.state.Collection_list.map(name=><Collection_Selector name={name} C={C} key={name}></Collection_Selector>)}
                    <a id="colec-adder" className="text-trigger" onClick={/*コレクションを追加*/()=>C.change_menu("AddCollectionMenu")}>+ {t("コレクションを追加")}...</a><br/>
                    <span>{t("オフラインプレイ")}</span>
                </div>
            </div>
        );
    }
    async componentDidMount(){
        let [servers,collections] = await request_servers_and_collections();
        this.setState({
            Server_list: servers,
            Collection_list: Object.keys(collections),
        });
        TEMP.collection_list = collections;
    }
}

async function request_servers_and_collections(){
    let servers = await db.servers.toArray();
    servers = servers.filter(server => server.name != "#master");//#masterを除外
    // servers = servers.map(server => {//Server_Menu用に変形
    //     return {name:server.name, address:server.address};
    // });
    let collections = await db.collections.toArray();
    let collections_data = {};
    collections.forEach(collection => {//Server_Menu用に変形
        collections_data[collection.name] = collection.data;
    });
    return [servers,collections_data];
}

async function delete_cache(){
    let result = confirm("本当にキャッシュを削除しますか？");
    if(result){
        let cache_hashes = (await db.cache.toArray()).map(obj => obj.hash);
        await db.cache.bulkDelete(cache_hashes);
        alert("すべてのキャッシュが削除されました。");
    }
};

const Server_Selector = props => {
    const C = props.C;
    const v = props.serv;
    console.log(v);
    const t = i18n.get_translator();
    return(
        <div className="menu-selector" onClick={async()=>{
            if(C.menu_route[C.menu_route.length-1] != "EditServerMenu"){
                $("#loading-cover").show();
                ADDRESS = v.address;
                SERVER_NAME = v.name;
                TEMP.serv_display_name = v.display_name; 
                try{
                    TEMP.server_info_data = await request_server_info(ADDRESS);
                    console.log(TEMP.server_info_data);
                    C.change_menu("ServerInfo");
                }catch(e){
                    console.error(e);
                    alert(`${e.name}: ${e.message}`);
                }
                $("#loading-cover").hide();
            }
        }}>
            <span>{v.display_name}</span>
            <span className="src-label">{v.address}</span>
            <img src="textures/edit.svg" className="item_editor" width="20" onClick={()=>{
                C.change_menu("EditServerMenu");
                TEMP.server = v;
            }} />
        </div>
    );
}

async function request_server_info(address){
    return JSON.parse(await request(address, "/sonolus/info", {
        localization:LOCALIZATION
    }));
}

const Collection_Selector = props => {
    const C = props.C;
    const t = i18n.get_translator();
    return(
        <div className="menu-selector" onClick={()=>{
            C.change_menu("EditCollectionMenu");
            TEMP.name = props.name;
        }}>
            <span>{props.name}</span>
        </div>
    );
}

const Add_Server_Menu = props => {
    const C = props.C;
    const t = i18n.get_translator();
    return(
    <div id="serv-add-menu">
        <h1 className="Menu-title">{t("サーバーを追加")}</h1>
        <h3 className="Item-name">{t("名前")}</h3>
        <input type="text" style={{width:"300px",fontSize:"20px"}} id="name"/>
        <h3 className="Item-name">{t("サーバーアドレス")}</h3>
        <input type="text" style={{width:"300px",fontSize:"20px"}} id="address"/>
        <br/><br/>
        <button id="cancel-trig" className="btn" onClick={()=>{
            C.back_menu();
            $("#serv-add-menu #name").val("");
            $("#serv-add-menu #address").val("");
        }}>{t("キャンセル")}</button>
        <button id="add-trig" className="btn" onClick={()=>{
            let name_str = $("#serv-add-menu #name").val();
            let address_str = $("#serv-add-menu #address").val();
            if(name_str && address_str){
                if(address_str.slice(-1) == "/"){
                    address_str = address_str.slice(0,-1);
                }
                address_str = address_str.replaceAll(" ","").replaceAll("　","");
                add_server(name_str,address_str);
                C.back_menu();
                $("#serv-add-menu #name").val("");
                $("#serv-add-menu #address").val("");
            }else{
                alert(t("名称アドレス必須"));
            }
        }}>{t("追加")}</button>
    </div>);
}

//サーバーを追加する
async function add_server(name,address){
    await db.servers.put({
        name: uuidv4(),
        display_name:name,
        address: address,
        option:{},
        version:SERVER_VERSION
    });
};

const Add_Collection_Menu = props => {
    const C = props.C;
    const t = i18n.get_translator();
    return(
    <div id="colec-add-menu" >
        <h1 className="Menu-title">{t("コレクションを追加")}</h1>
        <h3 className="Item-name">{t("名前")}</h3>
        <input type="text" style={{width:"300px",fontSize:"20px"}} id="name"/>
        <br/><br/>
        <button id="cancel-trig" className="btn" onClick={()=>{
            C.back_menu();
            $("#colec-add-menu #name").val("");
        }}>{t("キャンセル")}</button>
        <button id="add-trig" className="btn" onClick={async()=>{
            let collection_name = $("#colec-add-menu #name").val();
            if(collection_name){
                let collection_names = [];
                if(C.menu_route[C.menu_route.length-2] == "ServerMenu"){
                    collection_names = Object.keys(TEMP.collection_list);
                }else if(C.menu_route[C.menu_route.length-2] == "ItemInfo" || C.menu_route[C.menu_route.length-2] == "LevelInfo"){
                    collection_names = TEMP.collection_names;
                }
                if(collection_names.includes(collection_name)){
                    alert(t("名称既存"));
                }else{
                    $("#loading-cover").show();
                    await add_collection(collection_name);
                    if(C.menu_route[C.menu_route.length-2] == "ItemInfo" || C.menu_route[C.menu_route.length-2] == "LevelInfo"){
                        TEMP.collection_names.push(collection_name);
                    }
                    $("#loading-cover").hide();
                    C.back_menu();
                    $("#colec-add-menu #name").val("");
                }
            }else{
                alert(t("名称必須"));
            }
        }}>{t("追加")}</button>
    </div>);
} 

//コレクションを追加する
async function add_collection(name){
    await db.collections.put({
        name: name,
        data: {},
        version: COLLECTION_VERSION,
    });
};

const Edit_Server_Menu = props => {
    const C = props.C;
    const t = i18n.get_translator();
    return(
        <div id="serv-editor" >
            <h1 className="Menu-title">{t("サーバーを編集")}</h1>
            <h3 className="Item-name">{t("名前")}</h3>
            <input type="text" style={{width:"500px",fontSize:"20px"}} id="name" defaultValue={TEMP.server.display_name}/>
            <h3 className="Item-name">{t("サーバーアドレス")}</h3>
            <input type="text" style={{width:"500px",fontSize:"20px"}} id="address" defaultValue={TEMP.server.address}/>
            <br/><br/>
            <button id="cancel-trig" className="btn" onClick={()=>{
                delete TEMP.server;
                C.back_menu();
            }}>{t("キャンセル")}</button>
            <button id="delete-trig" className="btn red-btn" onClick={async()=>{
                let result = confirm(t("削除するか"));
                if(result){
                    await delete_server(TEMP.server.name);//サーバー削除
                    delete TEMP.server;
                    C.back_menu();//メニューを戻る
                }
            }}>{t("削除")}</button>
            <button id="edit-trig" className="btn" onClick={async()=>{
                if($("#serv-editor #name").val(),$("#serv-editor #address").val()){
                    if($("#serv-editor #address").val().slice(-1) == "/"){
                        $("#serv-editor #address").val($("#serv-editor #address").val().slice(0,-1));
                    }
                    await edit_server($("#serv-editor #name").val(), $("#serv-editor #address").val());//サーバー編集
                    delete TEMP.server;
                    C.back_menu();//メニューを戻る
                }else{
                    alert(t("名称アドレス必須"));
                }
            }}>{t("保存")}</button>
        </div>    
    );
}

//サーバーを編集する
async function edit_server(display_name,address){
    await db.servers.put({
        name:TEMP.server.name,
        display_name: display_name,
        address:address,
        option:TEMP.server.option,
        version:SERVER_VERSION
    });
};

//サーバーを削除する
async function delete_server(server_name){
    await db.servers.delete(server_name);
};

class Edit_Collection_Menu extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.name = TEMP.name;
        TEMP.edited_collection = {};
        let list = TEMP.collection_list[this.name];
        for(let key in list){
            TEMP.edited_collection[key] = false;
        }
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        let data = TEMP.collection_list[this.name];
        return(
            <div id="colec-editor">
                <h1 className="Menu-title">{t("コレクションを編集")}</h1>
                <h3 className="Item-name">{t("名前")}</h3>
                <input type="text" style={{width:"300px",fontSize:"20px"}} id="name" defaultValue={this.name}/>
                <div id="window" className="selector-window">
                    {Object.keys(data).map(k=>{
                        let item = data[k];
                        if(item.type == "levels"){
                            return <Level_Selector_With_Remover C={C} item={item} name={k} key={k}/>
                        }else{
                            return <Item_Selector_With_Remover C={C} title={item.title} type={item.type} thumbnail={item.thumbnail} name={k} key={k}/>
                        }
                        
                    })}
                </div>
                <button id="cancel-trig" className="btn" onClick={()=>{
                    C.back_menu();
                    delete TEMP.edited_collection;
                }}>{t("キャンセル")}</button>
                <button id="delete-trig" className="btn red-btn" onClick={()=>{
                    let result = confirm(t("削除するか"));
                    if(result){
                        delete_collection(this.name);//コレクション削除
                        C.back_menu();//メニューを戻る
                        delete TEMP.edited_collection;
                    }
                }}>{t("コレクションを削除")}</button>
                <button id="edit-trig" className="btn" onClick={async ()=>{
                    let result = confirm(t("決定するか"));
                    if(result){
                        if($("#colec-editor #name").val()){
                            for(let name in TEMP.edited_collection){
                                if(TEMP.edited_collection[name]){
                                    delete data[name];
                                }
                            }
                            await edit_collection(this.name,data);
                            C.back_menu();
                            delete TEMP.edited_collection;
                        }else{
                            alert(t("名称入力必須"));
                        }
                    }
                }}>{t("決定")}</button>
            </div> 
        );
    }
}

class Item_Selector_With_Remover extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.title = props.title;
        this.type = props.type;
        this.thumbnail = URL.createObjectURL(props.thumbnail);
        this.name = props.name;
        this.state = {
            removed:false
        }
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div style={{height: "70px",backgroundColor:this.state.removed?"red":"#20203c"}} className="menu-selector disable_pointer">
                <img src={this.thumbnail} style={{width:"70px",height:"70px"}}></img>
                <div className="ItemSelector-title">{this.title}</div>
                <div className="ItemSelector-author">{t(this.type)}</div>
                <img src={this.state.removed?"textures/cancel.svg":"textures/delete.svg"} className="colec-delete-trg" width="20" onClick={()=>{
                    TEMP.edited_collection[this.name] = !this.state.removed;
                    this.setState({removed:!this.state.removed});//反転
                }}/>
            </div>
        );
    }
}

class Level_Selector_With_Remover extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.item = props.item;
        this.title = props.item.title;
        this.level = props.item.level_info_data;
        this.name = props.name;
        this.thumbnail = URL.createObjectURL(props.item.thumbnail);
        this.state = {
            removed:false
        }
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div className="menu-selector disable_pointer" style={{height: "100px",backgroundColor:this.state.removed?"red":"#20203c"}}>
                <span className="colec-play-trg" onClick={async()=>{
                    $("#loading-cover").show();
                    TEMP.coll_level = this.item;
                    TEMP.collection_names = (await db.collections.toArray() || []).map(collection=>collection.name);
                    C.change_menu("LevelInfoOffline");
                    $("#loading-cover").hide();
                }}>{t("詳細")}</span>
                <img src={this.thumbnail} style={{width:"100px",height:"100px"}}></img>
                <span className="selector-title">{this.title}</span><br/>
                <span className="level-author">{t("作者")}: {this.level.author}<br/>{t("アーティスト")}: {this.level.artists}</span><br/>
                <span className="level-rating">{this.level.rating}</span>
                <img src={this.state.removed?"textures/cancel.svg":"textures/delete.svg"} className="colec-delete-trg" width="20" onClick={()=>{
                    TEMP.edited_collection[this.name] = !this.state.removed;
                    this.setState({removed:!this.state.removed});//反転
                }}/>
            </div>
        );
    }
}

//コレクションを編集する
async function edit_collection(orig_collection_name,collection_data){
    await db.collections.delete(orig_collection_name);
    await db.collections.put({
        name: $("#colec-editor #name").val(),
        data:collection_data,
        version: COLLECTION_VERSION,
    });
};

//コレクションを削除する
async function delete_collection(collection_name){
    await db.collections.delete(collection_name);
};

class Img_custom extends React.Component {
    constructor(props){
        super(props);
        this.src = props.src;
        this.className = props.className || "";
        this.style = props.style || {};
        this.requestable = false;
        this.className += " enable_pointer";
        
        if(this.src in THUMB_TMP){
            this.state = {
                src:THUMB_TMP[this.src]
            };
        }else{
            this.state = {
                src:this.src
            };
        }
        
    }
    render(){
        return <img src={this.state.src} className={this.className} style={this.style} onClick={()=>{
            if(this.requestable){
                this.requestable = false;
                this.setState({
                    src: "./textures/loading.svg"
                });
                fetch(RELAY_SERVER_URL,{
                    method:"POST",
                    body:JSON.stringify({
                        type:"content",
                        url:this.src
                    })
                }).then(response => {
                    if(response){
                        if(response.ok){
                            blob_override(response).then(blob => {
                                this.obj_url = URL.createObjectURL(blob);
                                this.setState({
                                    src: this.obj_url
                                });
                                THUMB_TMP[this.src] = this.obj_url;
                            });
                        }else{
                            this.setState({
                                src: "./textures/cloud_download.png"
                            });
                            this.requestable = true;
                            console.log(`thumbnail res: ${response.status},${response.statusText}`);
                        }
                    }else{
                        this.setState({
                            src: "./textures/cloud_download.png"
                        });
                        this.requestable = true;
                        console.log(`thumbnail res: レスポンスは無効です`);
                    }
                }).catch(response => {
                    if(response){
                        this.setState({
                            src: "./textures/cloud_download.png"
                        });
                        this.requestable = true;
                        console.error("thumbnail res:",response);
                    }else{
                        this.setState({
                            src: "./textures/cloud_download.png"
                        });
                        this.requestable = true;
                        console.log(`thumbnail res: レスポンスは無効です`);
                    }
                });
            }
        }} onError={()=>{
            this.setState({
                src: "./textures/cloud_download.png"
            });
            this.requestable = true;
        }}></img>
    }
}

class Server_Info extends React.Component {
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const data = TEMP.server_info_data;
        return(
            <div id="serv_info">
                {"banner" in data ? <Img_custom src={join_path(ADDRESS,data.banner.url)} className="banner"></Img_custom> : <></>}
                
                <button id="back-trg" className="btn" onClick={()=>{
                    C.back_menu();
                }}>{t("戻る")}</button>
                <h1 className="Menu-title">{data.title}</h1>
                <h3 className="Menu-title">{data.description}</h3>
                {data.buttons.map((server_info_button,i)=>{
                    switch(server_info_button.type){
                        //対応していない
                        case "authentication":
                        case "multiplayer":
                        case "replay":
                        case "configuration":
                            return <></>;
                        // case "configuration":
                        //     return <Config_Info config={data.configuration} C={C} key={i}></Config_Info>
                        default:
                            return <Item_List_Info type={singular2plural(server_info_button.type)} C={C} key={i}></Item_List_Info>;
                    }
                })}
            </div>
        );
    }
}

// class Config_Info extends React.Component {
//     constructor(props){
//         super(props);
//         this.Menu_Controller = props.C;//Controller
//         this.data_loaded = false;
//         this.config = props.config;
//         this.state = {
//             opened: false
//         };
//     }
//     render(){
//         const C = this.Menu_Controller;
//         const t = i18n.get_translator();
//         const l = i18n.get_label_getter();
//         if(!this.state.opened){
//             return(
//                 <div className="info-selector" onClick={()=>{
//                     this.setState({opened:true});
//                 }}>
//                     {t("configuration")}
//                 </div>
//             );
//         }else{
//             return(
//                 <div className="selector-window">
//                     <h3>{t("configuration")}{t("実装前")}</h3>
//                     <img src="./textures/close.svg" width="40" className="info-close-trg" onClick={()=>{
//                         this.setState({opened:false});
//                     }}></img>
//                     <div className="selector-window" >
//                         {this.config.options.map((option,i)=>{
//                             switch(option.type){
//                                 case "text":
//                                 case "textArea":
//                                     return <span key={i}>{option.name}{("description" in option) ? `(${option.description})` : ""} : {option.def}</span>;
//                                 case "slider":
//                                     return <span key={i}>{option.name}{("description" in option) ? `(${option.description})` : ""} : {option.def}{("unit" in option) ? option.unit : ""}</span>;
//                                 case "toggle":
//                                     return <span key={i}>{option.name}{("description" in option) ? `(${option.description})` : ""} : {option.def}</span>;
//                                 case "select":
//                                     return <span key={i}>{option.name}{("description" in option) ? `(${option.description})` : ""} : {option.values[option.def]}</span>;
//                                 default:
//                                     return <span key={i}>{option.name}{("description" in option) ? `(${option.description})` : ""} : unknown</span>;
//                             }
                            
//                         })}
//                     </div>
//                 </div>
//             );
//         }
//     }
// }

class Item_List_Info extends React.Component {
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.item_type = props.type;//複数形
        this.data_loaded = false;
        this.info_data = {};
        this.state = {
            opened: false
        };
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const l = i18n.get_label_getter();
        if(!this.state.opened){
            return(
                <div className="info-selector" onClick={()=>{
                    this.open_info();
                }}>
                    {t(this.item_type)}
                </div>
            );
        }else{
            return(
                <div className="selector-window">
                    <h3 className="Menu-title">{t(this.item_type)}</h3>
                    <img src="./textures/close.svg" width="40" className="info-close-trg" onClick={()=>{
                        this.setState({opened:false});
                    }}></img>
                    <div className="selector-window" >
                        {this.info_data.sections.map((section,i)=>{
                            return (
                                <Section title={l(section.title)} key={i}>
                                    {section.items.map((item,j)=>{
                                        if(section.itemType == "level"){
                                            return <Level_Selector C={C} level={item} key={j}></Level_Selector>
                                        }else if(section.itemType == "post"){
                                            return <Post_Selector C={C} post={item} key={j}></Post_Selector>
                                        }else if(section.itemType == "playlist"){
                                            return <PlayList_Selector C={C} playlist={item} key={j}></PlayList_Selector>
                                        }else{
                                            return <Item_Selector C={C} item={item} type={this.item_type} key={j}></Item_Selector>
                                        }
                                    })}
                                </Section>
                            );
                        })}
                    </div>
                    <button id="more"  className="text-trigger btn" data-type="particles" onClick={async()=>{
                        $("#loading-cover").show();
                        TEMP.item_type = this.item_type;
                        try{
                            TEMP.server_more_data = await request_server_more(ADDRESS,this.item_type,0);
                            console.log(TEMP.server_more_data);
                            C.change_menu("ServerMore");
                        }catch(e){
                            console.error(e);
                            alert(`${e.name}: ${e.message}`);
                        }
                        $("#loading-cover").hide();
                    }}>+ {t(this.item_type + "をもっと表示")}...</button>
                </div>
            );
        }
    }
    async open_info(){  
        if(!this.data_loaded){
            $("#loading-cover").show();
            try{
                this.info_data = JSON.parse(await request(ADDRESS,`/sonolus/${this.item_type}/info`,{localization:LOCALIZATION}));
                console.log(this.info_data);
                this.data_loaded = true;
                this.setState({opened:true});
            }catch(e){
                console.error(e);
                alert(`${e.name}: ${e.message}`);
            }
            $("#loading-cover").hide();
        }else{
            this.setState({opened:true});
        }
    }
}

const Section = function (params) {
    return (
        <div>
            <div className="section-title">{params.title}</div>
            {params.children}
        </div>
    );
} 

async function request_server_more(address,type,page_index,querys = {},is_infinite = false){
    if(is_infinite){
        console.log({
            localization:LOCALIZATION,
            cursor:page_index,
            ...querys,//検索クエリ
        });
        let response = await request(address,`/sonolus/${type}/list`,{
            localization:LOCALIZATION,
            cursor:page_index,
            ...querys,//検索クエリ
        });
        return JSON.parse(response);
    }else{
        console.log({
            localization:LOCALIZATION,
            page:page_index,
            ...querys,//検索クエリ
        });
        let response = await request(address,`/sonolus/${type}/list`,{
            localization:LOCALIZATION,
            page:page_index,
            ...querys,//検索クエリ
        });
        return JSON.parse(response);
    }
    
}

async function request(domain,endpoint,params){
    let response = await fetch(RELAY_SERVER_URL,{
        method:"POST",
        body:JSON.stringify({
            type:"info",
            domain:domain,
            endpoint:endpoint,
            params:JSON.stringify(params),
        })
    });
    if(response){
        if (response.ok){
            return await response.text();
        }else{
            throw new Error(`${response.status} : ${response.statusText}`);
        }
    }else{
        throw new Error("empty respose");
    }
}

class Post_Selector extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        let post = this.post = props.post;
        this.thumbnail = (post.thumbnail || {url:"./textures/noimage.png"}).url || "./textures/noimage.png";
        this.title = post.title;
        this.author = post.author;
        this.time = post.time;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        let request_domain = this.post.source || ADDRESS;
        return(
            <div className="menu-selector disable_pointer" style={{height: "100px"}}>
                <span className="selector-play-trg" onClick={async()=>{
                    $("#loading-cover").show();
                    try{
                        [TEMP.post_info_data,TEMP.collection_names] = await request_item_info(request_domain,"posts",this.post.name);
                        C.change_menu("PostInfo");
                    }catch(e){
                        console.error(e);
                        alert(`${e.name}: ${e.message}`);
                    }
                    $("#loading-cover").hide();
                }}>{t("詳細")}</span>
                <Img_custom src={join_path(request_domain,this.thumbnail)} style={{width:"100px",height:"100px"}}></Img_custom>
                <span className="selector-title">{this.title}</span><br/>
                <span className="level-author">{t("投稿者")}: {this.author}<br/>{t("時刻")}: {(new Date(this.time)).toLocaleString()}</span>
            </div>
        );
    }
}

class PlayList_Selector extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        let playlist = this.item = props.playlist;
        this.thumbnail = (playlist.thumbnail||{url:"./textures/noimage.png"}).url || "./textures/noimage.png";
        this.title = playlist.title;
        this.subtitle = playlist.subtitle;
        this.author = playlist.author;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        let request_domain = this.item.source || ADDRESS;
        return(
            <div className="menu-selector disable_pointer" style={{height: "100px"}}>
                <span className="selector-play-trg" onClick={async()=>{
                    $("#loading-cover").show();
                    try{
                        [TEMP.item_info_data,TEMP.collection_names] = await request_item_info(request_domain,"playlists",this.item.name);
                        C.change_menu("PlayListInfo");
                    }catch(e){
                        console.error(e);
                        alert(`${e.name}: ${e.message}`);
                    }
                    $("#loading-cover").hide();
                }}>{t("詳細")}</span>
                <Img_custom src={join_path(request_domain,this.thumbnail)} style={{width:"100px",height:"100px"}}></Img_custom>
                <span className="selector-title">{this.title}</span><br/>
                <span className="selector-author">{this.subtitle}<br/>{t("作者")}: {this.author}</span>
            </div>
        );
    }
}

class Level_Selector extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        let level = this.level = props.level;
        this.thumbnail = (level.cover || {url:"./textures/noimage.png"}).url || "./textures/noimage.png";
        this.title = level.title;
        this.author = level.author;
        this.artists = level.artists;
        this.rating = level.rating;
        this.do_request = "do_request" in props ? props.do_request : true;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        let request_domain = this.level.source || ADDRESS;
        return(
            <div className="menu-selector disable_pointer" style={{height: "100px"}}>
                <span className="selector-play-trg" onClick={async()=>{
                    $("#loading-cover").show();
                    if(this.do_request){
                        try{
                            [TEMP.level_info_data,TEMP.collection_names] = await request_item_info(request_domain,"levels",this.level.name);
                            C.change_menu("LevelInfo");
                        }catch(e){
                            console.error(e);
                            alert(`${e.name}: ${e.message}`);
                        }
                    }else{
                        C.change_menu("LevelInfo");
                    }
                    $("#loading-cover").hide();
                }}>{t("詳細")}</span>
                <Img_custom src={join_path(request_domain,this.thumbnail)} style={{width:"100px",height:"100px"}}></Img_custom>
                <span className="selector-title">{this.title}</span><br/>
                <span className="level-author">{t("作者")}: {this.author}<br/>{t("アーティスト")}: {this.artists}</span><br/>
                <span className="level-rating">{this.rating}</span>
            </div>
        );
    }
}

class Item_Selector extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        let item = this.item = props.item;
        this.thumbnail = (item.thumbnail||{url:"./textures/noimage.png"}).url || "./textures/noimage.png";
        this.title = item.title;
        this.subtitle = item.subtitle;
        this.author = item.author;
        this.type = props.type;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        let request_domain = this.item.source || ADDRESS;
        return(
            <div className="menu-selector disable_pointer" style={{height: "100px"}}>
                <span className="selector-play-trg" onClick={async()=>{
                    $("#loading-cover").show();
                    TEMP.item_type = this.type || TEMP.item_type;
                    try{
                        [TEMP.item_info_data,TEMP.collection_names] = await request_item_info(request_domain,TEMP.item_type,this.item.name);
                        C.change_menu("ItemInfo");
                    }catch(e){
                        console.error(e);
                        alert(`${e.name}: ${e.message}`);
                    }
                    $("#loading-cover").hide();
                }}>{t("詳細")}</span>
                <Img_custom src={join_path(request_domain,this.thumbnail)} style={{width:"100px",height:"100px"}}></Img_custom>
                <span className="selector-title">{this.title}</span><br/>
                <span className="selector-author">{this.subtitle}<br/>{t("作者")}: {this.author}</span>
            </div>
        );
    }
}

function join_path(domain,endpoint){
    if(~endpoint.indexOf("http") || ~endpoint.indexOf("./")){
        return endpoint;
    }else{
        if(domain.slice(-1) == "/"){
            domain = domain.slice(0,-1);
        }
        if(endpoint.slice(0,1) == "/"){
            endpoint = endpoint.slice(1);
        }
        return domain + "/" + endpoint;
    }
}

async function request_item_info(address,type,name){
    let collections = (await db.collections.toArray() || []).map(collection=>collection.name);
    let response = JSON.parse(await request(address, `/sonolus/${type}/${name}`, {
        localization:LOCALIZATION
    }));
    console.log(response);
    return[response,collections];
}

class Server_More extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.searches = TEMP.server_more_data.searches || [];
        this.pageCount = TEMP.server_more_data.pageCount == -1 ? Infinity : TEMP.server_more_data.pageCount
        console.log(TEMP.server_more_data);

        this.search_queries = [];
        this.queries = {};
        this.cursors = [""];
        if(this.searches.length > 0){
            this.searches.forEach((search,i)=>{
                this.search_queries.push({});
                for(let option of search.options){
                    this.search_queries[i][option.query] = option.def;
                }
            });

            this.state = {
                search_type:0,
                page_index:TEMP.SM_page_index || 0
            };
        }else{
            this.state = {
                search_type:-1,
                page_index:TEMP.SM_page_index || 0
            };
        }
        
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const l = i18n.get_label_getter();
        return(
            <div id="serv-more">
                <h3 id="title" className="page-title">{t(TEMP.item_type)}</h3>
                <div className="selector-window" id="filter">
                    <h3 className="Menu-title">検索</h3><br/>
                    <select className="search-option" onChange={(e)=>{
                        this.setState({search_type:e.target.value});
                    }}>
                        {this.searches.map((search,i) => {
                            return <option value={i} key={i}>{l(search.title)}</option>
                        })}
                    </select>
                    <div>
                        {this.state.search_type==-1?<span>{t("検索機能はありません")}</span>:this.searches[this.state.search_type].options.map((option,i)=>{
                            return <Search_Option option={option} search_queries={this.search_queries[this.state.search_type]} key={i}/>
                        })}
                    </div>
                    <button id="search" className="btn" onClick={async()=>{
                        $("#loading-cover").show();
                        let queries = {};
                        let correct = true;
                        for(let option of this.searches[this.state.search_type].options){
                            switch(option.type){
                                case "toggle":
                                    queries[option.query] = this.search_queries[this.state.search_type][option.query]?1:0;
                                    if(option.def == this.search_queries[option.query] && option.required) correct = false;
                                    break;
                                case "text":
                                case "slider":
                                case "select":
                                    queries[option.query] = this.search_queries[this.state.search_type][option.query];
                                    if(option.def == this.search_queries[option.query] && option.required) correct = false;
                                    break;
                                default:
                                    console.warn(`type=${option.type}の検索タイプは未実装です。`);
                                    break;
                            }
                        }
                        if(correct){
                            try{
                                TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,0,queries);
                                console.log(TEMP.server_more_data);
                                this.queries = queries;
                                this.setState({
                                    search_type:this.state.search_type,
                                    page_index:0 //初めのページから
                                });
                                TEMP.SM_page_index = 0;
                            }catch(e){
                                console.error(e);
                                alert(`${e.name}: ${e.message}`);
                            }
                        }else{
                            alert(t("required設定必須"));
                        }
                        $("#loading-cover").hide();
                    }}>{t("検索")}</button>
                    <button id="cancel" className="btn red-btn" onClick={async()=>{
                        $("#loading-cover").show();
                        try{
                            TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,0);
                            console.log(TEMP.server_more_data);
                            this.queries = {};
                            this.setState({
                                search_type:this.state.search_type,
                                page_index:0 //初めのページから
                            });
                            TEMP.SM_page_index = 0;
                        }catch(e){
                            console.error(e);
                            alert(`${e.name}: ${e.message}`);
                        }
                        $("#loading-cover").hide();
                    }}>{t("検索取消")}</button>
                </div>
                <div className="selector-window" id="window">
                    <p id="page-number">{this.state.page_index+1}/{this.pageCount}</p>
                    {this.prev_button()}{this.next_button()}{this.back_button()}

                    {TEMP.server_more_data.items.map((item,i)=>{
                        if(TEMP.item_type == "levels"){
                            return <Level_Selector C={C} level={item} key={item.name}/> ;
                        }else if(TEMP.item_type == "posts"){
                            return <Post_Selector C={C} post={item} key={item.name}/>;
                        }else if(TEMP.item_type == "playlists"){
                            return <PlayList_Selector C={C} playlist={item} key={item.name}/> ;
                        }else{
                            return <Item_Selector C={C} item={item} key={item.name}/>;
                        }
                    })}

                    {this.prev_button()}{this.next_button()}{this.back_button()}
                    <p id="page-number">{this.state.page_index+1}/{this.pageCount}</p>
                </div>
            </div>
        );
    }
    prev_button(){
        const C = this.Menu_Controller;
        return (
            <button 
                id="prev" 
                disabled={this.state.page_index <= 0}
                className="btn"
                onClick={async()=>{
                    $("#loading-cover").show();
                    let _page_index = this.state.page_index-1;
                    try{
                        if(TEMP.server_more_data.pageCount == -1){
                            TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,this.cursors[_page_index],this.queries,true);
                        }else{
                            TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,_page_index,this.queries);
                        }
                        
                        console.log(TEMP.server_more_data);
                        this.setState({
                            search_type:this.state.search_type,
                            page_index:_page_index
                        });
                        TEMP.SM_page_index = _page_index;
                    }catch(e){
                        console.error(e);
                        alert(`${e.name}: ${e.message}`);
                    }
                    $("#loading-cover").hide();
                }}
            >前 ←</button>
        );
    }
    next_button(){
        const C = this.Menu_Controller;
        return (
            <button 
                id="next" 
                disabled={TEMP.server_more_data.pageCount == -1 ? !("cursor" in TEMP.server_more_data) : this.state.page_index+1 >= this.pageCount}
                className="btn"
                onClick={async()=>{
                    $("#loading-cover").show();
                    let _page_index = this.state.page_index+1;
                    try{
                        if(TEMP.server_more_data.pageCount == -1){
                            this.cursors[_page_index] = TEMP.server_more_data.cursor;
                            TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,this.cursors[_page_index],this.queries,true);
                        }else{
                            TEMP.server_more_data = await request_server_more(ADDRESS,TEMP.item_type,_page_index,this.queries);
                        }
                        console.log(TEMP.server_more_data);
                        this.setState({
                            search_type:this.state.search_type,
                            page_index:_page_index
                        });
                        TEMP.SM_page_index = _page_index;
                    }catch(e){
                        console.error(e);
                        alert(`${e.name}: ${e.message}`);
                    }
                    $("#loading-cover").hide();
                }}
            >→ 次</button>
        );
    }
    back_button(){
        const C = this.Menu_Controller;
        return (
            <button id="back" className="btn" onClick={()=>{
                C.back_menu();
                TEMP.item_type = "";
                delete TEMP.SM_page_index;
                delete TEMP.server_more_data;
            }}>戻る</button>
        );
    }
}

class Search_Option extends React.Component{
    constructor(props){
        super(props);
        this.option = props.option;
        this.search_queries = props.search_queries;
        if(this.option.type == "slider"){
            this.state = {
                val:this.search_queries[this.option.query]
            }
        }
    }
    render(){
        const t = i18n.get_translator();
        const l = i18n.get_label_getter();

        switch(this.option.type){
            case "text":
                return <div>
                    <span>{l(this.option.name)}</span>{this.option.required?<img src="./textures/caution_orange.svg" height="30"/>:<></>}&emsp;<input type="text" className="search-option" placeholder={this.option.placeholder} defaultValue={this.search_queries[this.option.query]} onChange={(e)=>{this.search_queries[this.option.query] = e.target.value;}}/>{this.option.description?<div style={{fontSize:"10px",color:"lightgray"}}>{this.option.description}</div>:<></>}
                </div>
            case "slider":
                return <div>
                    <span>{l(this.option.name)}</span>&emsp;<input type="range" className="search-option" max={this.option.max} min={this.option.min} step={this.option.step} defaultValue={this.search_queries[this.option.query]} onChange={(e)=>{
                        this.search_queries[this.option.query] = e.target.value;
                        this.setState({
                            val:e.target.value
                        });
                    }}/><span>{this.state.val}</span><span>{this.option.unit||""}</span>{this.option.description?<div style={{fontSize:"10px",color:"lightgray"}}>{this.option.description}</div>:<></>}
                </div>
            case "toggle":
                return <div>
                    <span>{l(this.option.name)}</span>&emsp;<input type="checkbox" defaultChecked={this.search_queries[this.option.query]} onChange={(e)=>{this.search_queries[this.option.query] = e.target.checked;}}/>{this.option.description?<div style={{fontSize:"10px",color:"lightgray"}}>{this.option.description}</div>:<></>}
                </div>
            case "select":
                return <div>
                    <span>{l(this.option.name)}</span>&emsp;<select className="search-option" defaultValue={this.search_queries[this.option.query]} onChange={(e)=>{this.search_queries[this.option.query] = e.target.value;}}>
                        {this.option.values.map((value,i)=><option value={value.name} key={i}>{value.title}</option>)}
                    </select>
                </div>
            default:
                console.warn(`type=${this.option.type}の検索タイプは未実装です。`);
                return <></>;
        }
    }
}

class PlayList_info extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = {
            data : TEMP.item_info_data
        }
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div id="item-info">
                <h2 id="title" className="Menu-title">{this.state.data.item.title}</h2>
                <h3 id="subtitle" style={{color:"gray"}} className="Menu-title">{this.state.data.item.subtitle}</h3>
                <div className="selector-window" id="info">
                    <div>
                        {t("作者")}: {this.state.data.item.author}<br/><br/>
                        {t("説明")}: {this.state.data.description}<br/><br/>
                        {t("タグ")}: {(this.state.data.item.tags || []).map((tag)=>tag.title).join(", ")}
                    </div>
                </div>
                <div className="Info-controller">
                    <div className="Info-back-trig" id="back" onClick={()=>{
                        delete TEMP.item_info_data;
                        C.back_menu();
                    }}>{t("戻る")}</div>
                </div>
                <div className="selector-window" id="list">
                    {this.state.data.item.levels.map((level,i)=><Level_Selector C={C} level={level} key={i}></Level_Selector>)}
                </div>
            </div>
        );
    }
}

function initialize_Level_Info_state(data,offline=false){
    if(offline){
        return {
            data : data,
            ref_items:[],
            source_items:{
                "skin": {item:{unselected:true}},
                "background": {item:{unselected:true}},
                "effect": {item:{unselected:true}},
                "particle": {item:{unselected:true}},
                "engine": {item:{unselected:true}},
            }
        }
    }else{
        return {
            data : data,
            ref_items:[
                {default:true, type: "skins",item: data.item.useSkin.useDefault? data.item.engine.skin : data.item.useSkin.item},
                {default:true, type: "backgrounds",item: data.item.useBackground.useDefault? data.item.engine.background : data.item.useBackground.item},
                {default:true, type: "effects",item: data.item.useEffect.useDefault? data.item.engine.effect : data.item.useEffect.item},
                {default:true, type: "particles",item: data.item.useParticle.useDefault? data.item.engine.particle : data.item.useParticle.item},
                {default:true, type: "engines",item: data.item.engine},
            ],
            source_items:{
                "skin": {default:true, type: "skins",item: data.item.useSkin.useDefault? data.item.engine.skin : data.item.useSkin.item},
                "background": {default:true, type: "backgrounds",item: data.item.useBackground.useDefault? data.item.engine.background : data.item.useBackground.item},
                "effect": {default:true, type: "effects",item: data.item.useEffect.useDefault? data.item.engine.effect : data.item.useEffect.item},
                "particle": {default:true, type: "particles",item: data.item.useParticle.useDefault? data.item.engine.particle : data.item.useParticle.item},
                "engine": {default:true, type: "engines",item: data.item.engine},
            }
        }
    }
    
}

class Level_Info extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = initialize_Level_Info_state(TEMP.level_info_data);
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const item = this.state.data.item;
        let thumbnail = join_path(ADDRESS,(item.cover || {url:"./textures/noimage.png"}).url || "./textures/noimage.png");
        return(
            <div id="level-info">
                <h1 id="title" className="page-title">{item.title}</h1>
                <div className="selector-window" id="info" style={{display:"flex"}}>
                    <figure className="level-cover"><Img_custom src={thumbnail} style={{width:"300px",height:"300px"}}></Img_custom></figure>
                    <div style={{marginLeft:"20px"}}>
                        {t("作者")}: {item.author}<br/>
                        {t("アーティスト")}: {item.artists}<br/><br/>
                        {t("説明")}: {this.state.data.description}<br/><br/>
                        {t("おすすめ")}:{(this.state.data.recommended||[]).map(recommend=>(
                            <div className="text-trigger" onClick={async()=>{
                                $("#loading-cover").show();
                                try{
                                    [TEMP.level_info_data,TEMP.collection_names] = await request_item_info(ADDRESS,"levels",recommend.name);
                                    this.setState(initialize_Level_Info_state(TEMP.level_info_data));
                                }catch(e){
                                    console.error(e);
                                    alert(`${e.name}: ${e.message}`);
                                }
                                $("#loading-cover").hide();
                            }} key={recommend.name}>{recommend.title}</div>
                        ))}<br/><br/>
                        {t("タグ")}: {(item.tags || []).map((tag)=>tag.title).join(", ")}
                    </div>
                    
                </div>

                <div className="Info-controller">
                    <div className="Info-back-trig" id="back" onClick={()=>{
                        delete TEMP.level_info_data;
                        C.back_menu();
                    }}>{t("戻る")}</div>
                    <div className="Info-opt-trig" id="option" onClick={async()=>{
                        $("#loading-cover").show();
                        // level optionを取得
                        [TEMP.engine_option,TEMP.system_option] = await request_level_options(SERVER_NAME);
                        //engine configを取得
                        if(this.state.source_items.engine.default){
                            let config_SRL = this.state.source_items.engine.item.configuration;
                            try{
                                let engine_config = await request_engine_option(ADDRESS,config_SRL.url,config_SRL.hash);
                                TEMP.engine_option_data = engine_config.options;
                                C.change_menu("LevelOption");
                            }catch(e){
                                console.error(e);
                                alert(`${e.name}: ${e.message}`);
                            }
                        }else{
                            TEMP.engine_option_data = this.state.source_items.engine.item.engine_config.options;
                            C.change_menu("LevelOption");
                        }
                        $("#loading-cover").hide();
                    }}>{t("設定")}</div>
                    <div className="LevelInfo-selector">
                        <button id="add-coll" className="btn" onClick={async()=>{
                            let collection_name = $(".LevelInfo-selector #coll_selector").val();
                            if(collection_name){
                                $("#loading-cover").show();
                                let coll_item_names = await get_collection_item_names(collection_name);
                                if(coll_item_names.includes(this.state.data.item.name+"(level)")){
                                    alert(t("追加重複"));
                                }else{
                                    try{
                                        await add_collection_item(ADDRESS,collection_name,this.state.data.item,"levels");
                                        alert(t("追加完了"));
                                    }catch(e){
                                        console.error(e);
                                        alert(`${e.name}: ${e.message}`);
                                    }
                                }
                                $("#loading-cover").hide();
                            }else{
                                alert(t("追加先忘れ"));
                            }
                        }}>{t("追加")}</button>
                        &nbsp;{t("追加先")}:
                        <select id="coll_selector" onChange={()=>{
                            let selector = $(".LevelInfo-selector #coll_selector");
                            if(selector.val() == "#add"){
                                selector.val("");
                                C.change_menu("AddCollectionMenu");
                            }
                        }}>
                            <option value="" id="init">{t("コレクションを選択")}</option>
                            {TEMP.collection_names.map(collection=><option key={collection}>{collection}</option>)}
                            <option value="#add">{t("コレクションを追加")}...</option>
                        </select>
                    </div>
                    <div className="LevelInfo-run-trig" id="next"onClick={()=>{
                        TEMP.source_items = this.state.source_items;
                        TEMP.is_offline_level = false;
                        C.change_menu("SourceLoad");
                    }}>{t("プレイ")}</div>
                </div>

                <h3 className="Item-name">{t("現在のソース")}</h3>
                <div className="selector-window" id="source-selector">
                    <Item_Selector_on_LevelInfo C={C} type="skins" item={this.state.source_items.skin.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="backgrounds" item={this.state.source_items.background.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="effects" item={this.state.source_items.effect.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="particles" item={this.state.source_items.particle.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="engines" item={this.state.source_items.engine.item}/>
                </div>
                <h3 className="Item-name">{t("コレクション")}</h3>
                <div className="selector-window" id="item-selector">
                    {t("参照")}：
                    <select className="select-ref" onChange={async()=>{
                        $("#loading-cover").show();
                        let value = $("#level-info #item-selector select").val();
                        if(value == "default"){
                            let data = TEMP.level_info_data;
                            this.setState({ref_items:[
                                {default:true, type: "skins",item: data.item.useSkin.useDefault? data.item.engine.skin : data.item.useSkin.item},
                                {default:true, type: "backgrounds",item: data.item.useBackground.useDefault? data.item.engine.background : data.item.useBackground.item},
                                {default:true, type: "effects",item: data.item.useEffect.useDefault? data.item.engine.effect : data.item.useEffect.item},
                                {default:true, type: "particles",item: data.item.useParticle.useDefault? data.item.engine.particle : data.item.useParticle.item},
                                {default:true, type: "engines",item: data.item.engine},
                            ]});
                        }else{
                            let items = await get_collection_items(value);
                            let ref_items = [];
                            for(let [name,item] of Object.entries(items)){
                                item.name = name;
                                if(item.type != "levels"){
                                    ref_items.push({
                                        default: false,
                                        type: item.type,
                                        item: item
                                    });
                                }
                            }
                            this.setState({ref_items:ref_items});
                        }
                        $("#loading-cover").hide();
                    }}>
                        <option value="default">{t("デフォルト")}</option>
                        {TEMP.collection_names.map(collection=><option key={collection}>{collection}</option>)}
                    </select><br/>
                    <div id="window">
                        {this.state.ref_items.map(item=><Ref_Selector_on_LevelInfo C={C} onClick={()=>{
                            let source_obj = this.state.source_items;
                            source_obj[item.type.slice(0,-1)] = item;
                            this.setState({source_items:source_obj});
                        }} type={item.type} item={item} key={`${item.item.name||"default"}(${item.type})`}/>)}
                    </div>
                </div>
            </div>
        );
    }
}

class Level_Info_Offline extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = initialize_Level_Info_state(TEMP.level_info_data,true);
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const item = TEMP.coll_level;
        SERVER_NAME = item.server_name;
        const info = item.level_info_data;
        TEMP.level_info_data = {item:info};
        return(
            <div id="level-info">
                <h1 id="title" className="page-title">{info.title}</h1>
                <div className="selector-window" id="info" style={{display:"flex"}}>
                    <figure className="level-cover"><img src={URL.createObjectURL(item.thumbnail)} style={{width:"300px",height:"300px"}}></img></figure>
                    <div style={{marginLeft:"20px"}}>
                        {t("作者")}: {info.author}<br/>
                        {t("アーティスト")}: {info.artists}<br/><br/>
                        {t("説明")}: {info.description}<br/><br/>
                        {t("おすすめ")}:{(info.recommended||[]).map(recommend=>(
                            <div className="text-trigger" key={recommend.name}>{recommend.title}</div>
                        ))}
                    </div>
                    
                </div>

                <div className="Info-controller">
                    <div className="Info-back-trig" id="back" onClick={()=>{
                        delete TEMP.coll_level;
                        delete TEMP.level_info_data;
                        C.back_menu();
                    }}>{t("戻る")}</div>
                    <div className="Info-opt-trig" id="option" onClick={async()=>{
                        if(this.state.source_items.engine.item.unselected){
                            alert(t("エンジン選択必須"));
                        }else{
                            //engine configを取得
                            TEMP.engine_option_data = this.state.source_items.engine.item.engine_config.options;
                            // level optionを取得
                            [TEMP.engine_option,TEMP.system_option] = await request_level_options(item.server_name);
                            C.change_menu("LevelOption");
                        }   
                    }}>{t("設定")}</div>
                    <div className="LevelInfo-run-trig" id="next"onClick={()=>{
                        if(
                            this.state.source_items.skin.item.unselected ||
                            this.state.source_items.background.item.unselected ||
                            this.state.source_items.effect.item.unselected ||
                            this.state.source_items.particle.item.unselected ||
                            this.state.source_items.engine.item.unselected
                        ){
                            alert(t("ソース選択必須"));
                        }else{
                            TEMP.source_items = this.state.source_items;
                            TEMP.is_offline_level = true;
                            C.change_menu("SourceLoad");
                        }
                        
                    }}>{t("プレイ")}</div>
                </div>

                <h3 className="Item-name">{t("現在のソース")}</h3>
                <div className="selector-window" id="source-selector">
                    <Item_Selector_on_LevelInfo C={C} type="skins" item={this.state.source_items.skin.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="backgrounds" item={this.state.source_items.background.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="effects" item={this.state.source_items.effect.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="particles" item={this.state.source_items.particle.item}/>
                    <Item_Selector_on_LevelInfo C={C} type="engines" item={this.state.source_items.engine.item}/>
                </div>
                <h3 className="Item-name">{t("コレクション")}</h3>
                <div className="selector-window" id="item-selector">
                    {t("参照")}：
                    <select className="select-ref" onChange={async()=>{
                        $("#loading-cover").show();
                        let value = $("#level-info #item-selector select").val();
                        if(value){
                            let items = await get_collection_items(value);
                            let ref_items = [];
                            for(let [name,item] of Object.entries(items)){
                                item.name = name;
                                if(item.type != "levels"){
                                    ref_items.push({
                                        default: false,
                                        type: item.type,
                                        item: item
                                    });
                                }
                            }
                            this.setState({ref_items:ref_items});
                        }else{
                            this.setState({ref_items:[]});
                        }
                        $("#loading-cover").hide();
                    }}>
                        <option value="">{t("コレクションを選択")}</option>
                        {TEMP.collection_names.map(collection=><option key={collection}>{collection}</option>)}
                    </select><br/>
                    <div id="window">
                        {this.state.ref_items.map(item=><Ref_Selector_on_LevelInfo C={C} onClick={()=>{
                            let source_obj = this.state.source_items;
                            source_obj[item.type.slice(0,-1)] = item;
                            this.setState({source_items:source_obj});
                        }} type={item.type} item={item} key={`${item.item.name||"default"}(${item.type})`}/>)}
                    </div>
                </div>
            </div>
        );
    }
}

const Item_Selector_on_LevelInfo = props => {
    const t = i18n.get_translator();
    if(props.item.unselected){
        return(
            <div style={{height: "70px"}} className="menu-selector">
                <img src="./textures/caution.svg" style={{width:"70px",height:"70px"}}></img>
                <div className="ItemSelector-title">下のコレクション欄から選択してください。</div>
                <div className="ItemSelector-author">{t(props.type)}</div>
            </div>
        );
    }else{
        let item = props.item;
        let thumbnail;
        let title = item.title;
        if("type" in item){
            // thumbnail = item.thumbnail||"./textures/noimage.png";
            thumbnail = URL.createObjectURL(item.thumbnail);
        }else{
            thumbnail = (item.thumbnail||{url:"./textures/noimage.png"}).url;
        }
        // console.log(join_path(ADDRESS,thumbnail));
        return(
            <div style={{height: "70px"}} className="menu-selector">
                <Img_custom src={join_path(ADDRESS,thumbnail)} style={{width:"70px",height:"70px"}} key={thumbnail}></Img_custom>
                <div className="ItemSelector-title">{title}</div>
                <div className="ItemSelector-author">{t(props.type)}</div>
            </div>
        );
    }
    
}

class Ref_Selector_on_LevelInfo extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.item = props.item.item;
        if(props.item.default){
            this.thumbnail = (this.item.thumbnail||{url:"./textures/noimage.png"}).url;
            this.title = this.item.title;
        }else{
            // this.thumbnail = this.item.thumbnail||"./textures/noimage.png";
            this.thumbnail = URL.createObjectURL(this.item.thumbnail);
            this.title = this.item.title;
        }
        this.type = props.type;
        this.onClick = props.onClick;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div style={{height: "70px"}} className="menu-selector disable_pointer">
                <Img_custom src={join_path(ADDRESS,this.thumbnail)} style={{width:"70px",height:"70px"}}></Img_custom>
                <div className="ItemSelector-title">{this.title}</div>
                <div className="ItemSelector-author">{t(this.type)}</div>
                <span className="selector-coll-trg" onClick={this.onClick}>{t("適用")}</span>
            </div>
        );
    }
}

async function request_engine_option(address,url,hash){
    let data = await get_content(address,url,hash);
    return JSON.parse(await gzip_uncomp(data));
}

async function request_level_options(server_name){
    let engine_option = (await db.servers.get(server_name)).option;
    let system_option = (await db.servers.get("#master")).option.system_option;
    console.log(system_option);
    return [engine_option,system_option];
}

async function get_collection_items(collection_name){
    let collection = await db.collections.get(collection_name);
    return collection.data;
}

class Level_Option extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = {
            data : TEMP.item_info_data
        }
        TEMP.tmp_system_option = Object.assign({},TEMP.system_option);//浅いコピー
        TEMP.tmp_engine_option = {};
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        const l = i18n.get_label_getter();
        const Op = TEMP.system_option;
        const SysOp_update = (key,val_ratio=1)=>{
            return (e)=>{
                switch(e.target.type){
                    case "range":
                        TEMP.tmp_system_option[key] = Number(e.target.value)*val_ratio;
                        break;

                    case "checkbox":
                        TEMP.tmp_system_option[key] = (e.target.value == "on");
                        break;

                    case "select":
                        TEMP.tmp_system_option[key] = Number(e.target.value);
                        break;
                    
                    default:
                        console.error(`"${e.target.type}"というoption typeは存在しません。`);
                        break;
                }
            };
        };
        return(
            <div id="level-option" >
                <h2 className="Menu-title">設定</h2>
                <h3 className="Item-name">レベル設定</h3>
                <div className="selector-window" id="level-op">
                    {TEMP.engine_option_data.map(option => {
                        let default_val;
                        if("scope" in option){
                            if(option.scope in TEMP.engine_option){//スコープがengine_optionに存在するか
                                if(option.name in TEMP.engine_option[option.scope]){//オプションがスコープに存在するか
                                    default_val = TEMP.engine_option[option.scope][option.name];
                                }else{
                                    default_val = option.def;
                                }
                            }else{
                                default_val = option.def;
                            }
                        }else{
                            const scope = "level:"+TEMP.level_info_data.item.name;
                            if(scope in TEMP.engine_option){//レベルスコープがengine_optionに存在するか
                                if(option.name in TEMP.engine_option[scope]){//オプションがスコープに存在するか
                                    default_val = TEMP.engine_option[scope][option.name];
                                }else{
                                    default_val = option.def;
                                }
                            }else{
                                default_val = option.def;
                            }
                        }
                        TEMP.tmp_engine_option[option.name] = default_val;
                        switch(option.type){
                            case "slider":
                                return <Option_Item 
                                    C={C} 
                                    type="slider" 
                                    min={option.min} 
                                    max={option.max} 
                                    step={option.step} 
                                    def={default_val} 
                                    standard={option.standard||false} 
                                    onChange={(e)=>TEMP.tmp_engine_option[option.name] = Number(e.target.value)}
                                    unit="" 
                                    key={option.name}
                                >
                                    {l(option.name)}
                                </Option_Item>;
                            case "toggle":
                                return <Option_Item 
                                    C={C} type="toggle"  
                                    def={default_val==1?true:false} 
                                    key={option.name}
                                    onChange={(e)=>TEMP.tmp_engine_option[option.name] = e.target.checked?1:0}
                                >
                                    {l(option.name)}
                                </Option_Item> ;
                            // case "select":
                            //     return <Option_Item C={C} type="select" min={} max={0.5} step={0.01} def={default_val}>オーディオオフセット</Option_Item> ;
                        }
                    })}
                </div>
                <h3 className="Item-name">システム設定</h3>
                <div className="selector-window" id="system-op">
                    <Option_Item C={C} type="slider" min={0} max={100} step={0.1} def={Op.bgm_volume} onChange={SysOp_update("bgm_volume")} unit="%">BGM音量</Option_Item> 
                    <Option_Item C={C} type="slider" min={0} max={100} step={0.1} def={Op.effect_volume} onChange={SysOp_update("effect_volume")} unit="%">エフェクト音量</Option_Item> 
                    <Option_Item C={C} type="slider" min={-500} max={500} step={5} def={Op.audio_offset*1000} onChange={SysOp_update("audio_offset",1/1000)} unit="ms">オーディオオフセット</Option_Item> 
                    <Option_Item C={C} type="slider" min={-500} max={500} step={5} def={Op.input_offset*1000} onChange={SysOp_update("input_offset",1/1000)} unit="ms">入力オフセット</Option_Item> 
                    {/* <Option_Item C={C} type="slider" min={0.3} max={1.2} step={0.05} def={Op.render_scale} onChange={SysOp_update("render_scale")} unit="x">レンダリングスケール(未実装)</Option_Item>  */}
                    {/* <Option_Item C={C} type="toggle" def={Op.homography} onChange={SysOp_update("homography")}>射影変換</Option_Item>  */}
                    <Option_Item C={C} type="slider" min={2} max={8} step={1} def={Op.mesh_vertexes} onChange={SysOp_update("mesh_vertexes")} unit="">メッシュの頂点数</Option_Item> 
                    <Option_Item C={C} type="slider" min={2} max={8} step={1} def={Op.curv_vertexes} onChange={SysOp_update("curv_vertexes")} unit="">カーブメッシュの頂点数</Option_Item> 
                    <Option_Item C={C} type="slider" min={0} max={120} step={1} def={Op.max_fps} onChange={SysOp_update("max_fps")} unit="fps">最大fps(0で最大限)</Option_Item> 
                    <Option_Item C={C} type="slider" min={0.2} max={1} step={0.05} def={Op.texture_scale} onChange={SysOp_update("texture_scale")} unit="x">テクスチャスケール(メモリ使用量に影響)</Option_Item> 
                    <Option_Item C={C} type="toggle" def={false}>デバッグモード</Option_Item> 
                </div>
                <div className="selector-window">
                    <Option_Item C={C} type="toggle" def={TEMP.key_assign_enabled} onChange={(e)=>{
                        TEMP.key_assign_enabled = e.target.checked;
                    }}>キーアサイン</Option_Item>
                    {TEMP.key_assign_enabled ? t("キーアサインファイルロード済") : t("キーアサインファイルロードなし")}
                    <input type="file" id="key_assign_file_selector"/>
                </div>
                <button id="LevelOption-back" className="btn" onClick={()=>{
                    C.back_menu();
                }}>キャンセル</button>
                <button id="LevelOption-save" className="btn" onClick={async()=>{
                    TEMP.system_option = TEMP.tmp_system_option;
                    for(let option of TEMP.engine_option_data){
                        if("scope" in option){
                            if(!(option.scope in TEMP.engine_option)){//スコープがengine_optionに存在しない場合
                                TEMP.engine_option[option.scope] = {};
                            }
                            //オプションがスコープに存在しなくても要素が作成される。
                            TEMP.engine_option[option.scope][option.name] = TEMP.tmp_engine_option[option.name];
                        }else{
                            const scope = "level:"+TEMP.level_info_data.item.name;
                            if(!(scope in TEMP.engine_option)){//レベルスコープがengine_optionに存在しない場合
                                TEMP.engine_option[scope] = {};
                            }
                            //オプションがスコープに存在しなくても要素が作成される。
                            TEMP.engine_option[scope][option.name] = TEMP.tmp_engine_option[option.name];
                        }
                    }
                    delete TEMP.engine_option["level:undefined"];
                    let org_serv = await db.servers.get(SERVER_NAME);
                    await db.servers.put({
                        address:org_serv.address,
                        name:SERVER_NAME,
                        option:TEMP.engine_option,
                        display_name:org_serv.display_name,
                        version:SERVER_VERSION
                    });
                    let master_serv = await db.servers.get("#master");
                    master_serv.option.system_option = TEMP.system_option;
                    await db.servers.put(master_serv);

                    if( TEMP.key_assign_enabled && $("#key_assign_file_selector").val()){
                        try{
                            TEMP.key_assign_data = await (() => {
                                return new Promise((resolve) => {
                                    let file = $("#key_assign_file_selector").prop("files")[0];
                                    let reader = new FileReader();
                                    reader.onload = () => {
                                        resolve(JSON.parse(reader.result));
                                    };
                                    reader.readAsText(file);
                                });
                            })();
                            console.log("keyassign:",TEMP.key_assign_data);
                        }catch(e){
                            console.warn(e);
                            alert(t("キーアサインファイル無効"));
                            return;
                        }
                    }

                    C.back_menu();
                }}>保存</button>
            </div>
        )
    }
}

class Option_Item extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.type = props.type;
        this.label = props.children;
        //すべてのタイプに存在
        this.standard = props.standard;
        //タイプごとに属性取得
        switch (this.type) {
            case "slider":
                this.min = props.min;
                this.max = props.max;
                this.step = props.step;
                this.unit = props.unit;
                this.def = props.def;
                this.state = {
                    value:props.def
                };
                break;
            case "toggle":
                this.def = props.def;
                break;
            case "select":
                this.def = props.def;
                this.values = props.values;
                break;
            default:
                console.warn(`Option type "${this.type}" does not exist.`);
                break;
        }
        this.onChange = props.onChange;
    }
    render(){
        const t = i18n.get_translator();
        let standard_label = this.standard?<img src="./textures/caution.svg" style={{height:"1em",width:"1em"}}/>:<></>;
        switch(this.type){
            case "slider":
                return <div>{this.label}{standard_label}: <input type="range" min={this.min} max={this.max} step={this.step} defaultValue={this.def} onChange={e=>{
                    if(this.onChange){
                        this.onChange(e);
                    }
                    this.setState({value:e.target.value});
                }}/>&nbsp;{this.state.value}{this.unit}</div>
            case "toggle":
                return <div>{this.label}{standard_label}: <input type="checkbox" defaultChecked={this.def} onChange={(e)=>{
                    if(this.onChange){
                        this.onChange(e);
                    }
                }}/></div>
            case "select":
                return <div>{this.label}{standard_label}: <select onChange={e=>{
                    if(this.onChange){
                        this.onChange(e);
                    }
                }}>{Object.entries(this.values).map((index,value)=><option key={value} value={index} selected={index==this.def}>{value}</option>)}</select></div>
            default:
                return <div>{this.label}: Error Option</div>;
        }
    }
}

class Item_Info extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = {
            data : TEMP.item_info_data,
        }
        this.type = TEMP.item_type;
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div id="item-info">
                <h2 id="title" className="Menu-title">{this.state.data.item.title}</h2>
                <h3 id="subtitle" style={{color:"gray"}} className="Menu-title">{this.state.data.item.subtitle}</h3>
                <div className="selector-window" id="info">
                    <div>
                        {t("作者")}: {this.state.data.item.author}<br/><br/>
                        {t("説明")}: {this.state.data.description}<br/><br/>
                        {t("おすすめ")}:{(this.state.data.recommended||[]).map(recommend=>(
                            <div className="text-trigger" onClick={async()=>{
                                $("#loading-cover").show();
                                try{
                                    [TEMP.item_info_data,TEMP.collection_names] = await request_item_info(ADDRESS,TEMP.item_type,recommend.name);
                                    this.setState({data: TEMP.item_info_data});
                                }catch(e){
                                    console.error(e);
                                    alert(`${e.name}: ${e.message}`);
                                }
                                $("#loading-cover").hide();
                            }} key={recommend.name}>{recommend.title}</div>
                        ))}<br/><br/>
                        {t("タグ")}: {(this.state.data.item.tags || []).map((tag)=>tag.title).join(", ")}
                    </div>
                </div>
                <div className="Info-controller">
                    <div className="Info-back-trig" id="back" onClick={()=>{
                        delete TEMP.item_info_data;
                        C.back_menu();
                    }}>{t("戻る")}</div>
                    <div className="ItemInfo-selector">
                        <button id="next" className="btn" onClick={async()=>{
                            let collection_name = $("#item-info .ItemInfo-selector #selector").val();
                            if(collection_name){
                                $("#loading-cover").show();
                                let coll_item_names = await get_collection_item_names(collection_name);
                                if(coll_item_names.includes(`${this.state.data.item.name}(${plural2singular(this.type)})`)){
                                    alert(t("追加重複"));
                                }else{
                                    try{
                                        await add_collection_item(ADDRESS,collection_name,this.state.data.item,this.type);
                                        alert(t("追加完了"));
                                    }catch(e){
                                        console.error(e);
                                        alert(`${e.name}: ${e.message}`);
                                    }
                                }
                                $("#loading-cover").hide();
                            }else{
                                alert(t("追加先忘れ"));
                            }
                        }}>{t("追加")}</button>
                        &nbsp;{t("追加先")}:
                        <select id="selector" onChange={()=>{
                            let selector = $("#item-info .ItemInfo-selector #selector");
                            if(selector.val() == "#add"){
                                selector.val("");
                                C.change_menu("AddCollectionMenu");
                            }
                        }}>
                            <option value="" id="init">{t("コレクションを選択")}</option>
                            {TEMP.collection_names.map(collection=><option key={collection}>{collection}</option>)}
                            <option value="#add">{t("コレクションを追加")}...</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    }
}

function get_collection_item_names(collection_name){
    return new Promise((resolve,reject)=>{
        db.collections.get(collection_name).then(e => {
            resolve(Object.keys(e.data));
        });
    });
    
}

async function add_collection_item(address,collection_name,item,type){
    let e = await db.collections.get(collection_name);
    if(type == "levels"){
        item.thumbnail = item.cover;
    }
    let thumbnail = await get_content(address,item.thumbnail.url,item.thumbnail.hash);
    // let thumbnail = join_path(address,item.thumbnail.url);
    switch(type){
        case "levels":
            let level_data = await get_content(address,item.data.url,item.data.hash);
            level_data = JSON.parse(await gzip_uncomp(level_data));
            let level_BGM = await get_content(address,item.bgm.url,item.bgm.hash);
            e.data[item.name+"(level)"] = {
                type:"levels",
                title:item.title,
                level_data:level_data,
                level_info_data:item,
                level_BGM:level_BGM,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        case "skins":
            let texture_data = await get_content(address,item.data.url,item.data.hash);
            texture_data = JSON.parse(await gzip_uncomp(texture_data));
            let texture_img = await get_content(address,item.texture.url,item.texture.hash);
            e.data[item.name+"(skin)"] = {
                type:"skins",
                title:item.title,
                texture_data:texture_data,
                texture_img:texture_img,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        case "backgrounds":
            let background_data = await get_content(address,item.data.url,item.data.hash);
            background_data = JSON.parse(await gzip_uncomp(background_data));
            let background_config = await get_content(address,item.configuration.url,item.configuration.hash);
            background_config = JSON.parse(await gzip_uncomp(background_config));
            let background_img = await get_content(address,item.image.url,item.image.hash);
            e.data[item.name+"(background)"] = {
                type:"backgrounds",
                title:item.title,
                background_data:background_data,
                background_config:background_config,
                background_img:background_img,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        case "effects":
            let effect_data = await get_content(address,item.data.url,item.data.hash);
            effect_data = JSON.parse(await gzip_uncomp(effect_data));
            let effect_audio = await get_content(address,item.audio.url,item.audio.hash);
            effect_audio = await zip_uncomp(effect_audio);
            e.data[item.name+"(effect)"] = {
                type:"effects",
                title:item.title,
                effect_data:effect_data,
                effect_audio:effect_audio,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        case "particles":
            let particle_data = await get_content(address,item.data.url,item.data.hash);
            particle_data = JSON.parse(await gzip_uncomp(particle_data));
            let particle_tex = await get_content(address,item.texture.url,item.texture.hash);
            e.data[item.name+"(particle)"] = {
                type:"particles",
                title:item.title,
                particle_data:particle_data,
                particle_tex:particle_tex,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        case "engines":
            //playDataに対応
            let engine_data = await get_content(address,(item.playData || item.data).url,(item.playData || item.data).hash);
            engine_data = JSON.parse(await gzip_uncomp(engine_data));
            let engine_config = await get_content(address,item.configuration.url,item.configuration.hash);
            engine_config = JSON.parse(await gzip_uncomp(engine_config));
            e.data[item.name+"(engine)"] = {
                type:"engines",
                title:item.title,
                engine_data:engine_data,
                engine_config:engine_config,
                thumbnail:thumbnail,
                server_name:SERVER_NAME
            };
            break;
        default:
            console.error(`"${type}" is not found.`);
            break;
    }
    await db.collections.put({
        name:collection_name,
        data:e.data,
        version: COLLECTION_VERSION,
    });
}

class Post_Info extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.state = {
            data : TEMP.post_info_data,
        }
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return(
            <div id="item-info">
            <h2 id="title">{this.state.data.item.title}</h2>
            <h3 id="time" style={{color:"gray"}}>{(new Date(this.state.data.item.time)).toLocaleString()}</h3>
            <div className="selector-window" id="info">
                <div>
                    {t("投稿者")}: {this.state.data.item.author}<br/><br/>
                    {t("本文")}:<br/>
                    {}
                </div>
            </div>
                <div className="Info-back-trig" id="back" onClick={()=>{
                    delete TEMP.post_info_data;
                    C.back_menu();
                }}>{t("戻る")}</div>
            </div>
        );
    }
}

const Log_Text = props => {
    if(props.successful){
        return (
            <div className="log-text-successful">{props.children}</div>
        );
    }else{
        return (
            <div className="log-text">{props.children}</div>
        );
    }
    
}

class Source_Load extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
        this.log_texts = [];
        this.sources = {};
        this.state = {
            log:[],
            can_start:false
        }
        this.canceled = false;
        this.error = false;
        // if(!TEMP.started_loading_source){
        //     TEMP.started_loading_source = true;
        //     this.load_sources();
        // }
        
    }
    componentDidMount(){
        this.load_sources();
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return (
            <div>
                <h1>{t("ソースロード")}</h1>
                <div className="loading-log">
                    {this.state.log}
                </div>
                <div className="start-play-trg-container">
                    <div className="start-cancel-trg" onClick={()=>{
                        if(this.state.can_start || this.error){
                            $("#processing-cover").show();
                            this.cancel();
                        }else{
                            $("#processing-cover").show();
                            this.canceled = true;
                        }
                    }}>{t("キャンセル")}</div>
                    <div className="start-play-trg" disabled={!this.state.can_start} onClick={()=>{
                        if(this.state.can_start){
                            console.log(this.sources);
                            $("#processing-cover").show();
                            setTimeout(() => {
                                this.play();
                            },100);
                        }
                    }}>{t("スタート")}</div>
                </div>  
                
            </div>
        );
    }
    add(text,successful = true){
        const t = i18n.get_translator();
        let log = this.state.log;
        if(log.length > 0 && successful){
            log[log.length-1] = <Log_Text successful={true} key={log.length-1}>{this.log_texts[this.log_texts.length-1]} ... {t("完了")}</Log_Text>;
        }
        log.push(<Log_Text successful={false} key={log.length}>{text}</Log_Text>);
        this.setState({log:log});
        this.log_texts.push(text);
    }
    // update(index,text,successful = false){
    //     this.state.log[index] = <div className="log-text" key={index}>{text}</div>;
    // }
    async load_sources(){
        const t = i18n.get_translator();
        let level = TEMP.level_info_data.item;
        let SI = TEMP.source_items;
        console.log(level);
        try{
            this.add(t("エンジンデータロード"));
            this.sources.engine_data = await load_data("engine","engine_data",["playData","data"]);
            if(this.canceled) return this.cancel();

            this.add(t("エンジンコンフィグロード"));
            let engine_config = await load_data("engine","engine_config",["configuration"]);
            //level_optionを生成
            let custum_serv_options = (await db.servers.get(SERVER_NAME)).option;
            let level_option = [];
            for(let option of engine_config.options){
                let scope = option.scope || `level:${level.name}`;
                if(scope in custum_serv_options){
                    if(option.name in custum_serv_options[scope]){
                        level_option.push(custum_serv_options[scope][option.name]);
                    }else{
                        level_option.push(option.def);
                    }
                }else{
                    level_option.push(option.def);
                }
            }
            this.sources.engine_config = engine_config;
            this.sources.level_option = level_option;
            if(this.canceled) return this.cancel();

            this.add(t("スキンデータロード"));
            this.sources.texture_data = await load_data("skin","texture_data",["data"]);
            if(this.canceled) return this.cancel();

            this.add(t("レベルデータロード"));
            let level_data;
            if(TEMP.is_offline_level){
                level_data = TEMP.coll_level.level_data;
                this.sources.level_data = level_data;
            }else{
                level_data = await get_content(ADDRESS,level.data.url,level.data.hash);
                level_data = JSON.parse(await gzip_uncomp(level_data));
                this.sources.level_data = level_data;
            }
            if(this.canceled) return this.cancel();
            

            this.add(t("パーティクルデータロード"));
            this.sources.particle_data = await load_data("particle","particle_data",["data"]);
            if(this.canceled) return this.cancel();

            this.add(t("背景データロード"));
            this.sources.background_data = await load_data("background","background_data",["data"]);
            if(this.canceled) return this.cancel();

            this.add(t("背景コンフィグロード"));
            this.sources.background_config = await load_data("background","background_config",["configuration"]);
            if(this.canceled) return this.cancel();

            this.add(t("システム設定ロード"));
            this.sources.system_options = (await db.servers.get("#master")).option.system_option;
            if(this.canceled) return this.cancel();

            this.add(t("エフェクトロード"));
            let effect_data = [];
            try{
                if(SI.effect.default){
                    let effect_clips = await get_content(ADDRESS,SI.effect.item.data.url,SI.effect.item.data.hash);
                    effect_clips = JSON.parse(await gzip_uncomp(effect_clips));
                    let effect_audio = await get_content(ADDRESS,SI.effect.item.audio.url,SI.effect.item.audio.hash);
                    effect_audio = await zip_uncomp(effect_audio);
                    for(let clip of effect_clips.clips){
                        effect_data[clip.name] = effect_audio[clip.filename];
                    }
                }else{
                    for(let clip of SI.effect.item.effect_data.clips){
                        effect_data[clip.name] = SI.effect.item.effect_audio[clip.filename];
                    }
                }
                for(let [id,blob] of Object.entries(effect_data)){
                    let uri = URL.createObjectURL(blob);
                    effect_data[id] = new Howl({
                        src:uri,
                        format: "mp3",
                    });
                    if(effect_data[id].state() == "unloaded"){
                        await wait_onload(effect_data[id],"load");
                    }
                    URL.revokeObjectURL(uri);
                }
            }catch(e){
                console.warn(e.message);
            }
            this.sources.effect_data = effect_data;
            if(this.canceled) return this.cancel();

            this.add(t("スキンテクスチャロード"));
            this.sources.texture_img = await load_image("skin","texture_img","texture");
            if(this.canceled) return this.cancel();

            this.add(t("パーティクルテクスチャロード"));
            this.sources.particle_img = await load_image("particle","particle_tex","texture");
            if(this.canceled) return this.cancel();
            
            this.add(t("背景画像ロード"));
            this.sources.background_img = await load_image("background","background_img","image");
            if(this.canceled) return this.cancel();
            
            this.add(t("システムテクスチャロード"));
            this.sources.system_tex = new Image();
            this.sources.system_tex.src = "./textures/system_tex.webp";
            await wait_onload(this.sources.system_tex);
            if(this.canceled) return this.cancel();
            
            this.add(t("楽曲ダウンロード"));
            let BGM_uri;
            if(TEMP.is_offline_level){
                BGM_uri = URL.createObjectURL(TEMP.coll_level.level_BGM);
            }else{
                BGM_uri = URL.createObjectURL(await get_content(ADDRESS,level.bgm.url,level.bgm.hash));
            }
            this.sources.BGM = new Howl({
                src:BGM_uri,
                format: "mp3",
            });
            if(this.canceled) return this.cancel();
            
            this.add(t("楽曲ロード"));
            if(this.sources.BGM.state() == "unloaded"){
                await wait_onload(this.sources.BGM,"load");
            }
            URL.revokeObjectURL(BGM_uri);//メモリリーク対策
            if(this.canceled) return this.cancel();

            if(TEMP.key_assign_enabled){
                this.add(t("キーアサインロード"));
                this.sources.key_assign_data = TEMP.key_assign_data;
            }else{
                this.sources.key_assign_data = null;
            }
            if(this.canceled) return this.cancel();

            this.add(t("ロード完了"));

            this.setState({can_start:true});
        }catch(e){
            this.add(`ロード中にエラーが発生しました。(${e.name}: ${e.message})`,false);
            console.error(e);
            this.error = true;
        }
    }

    cancel(){
        $("#processing-cover").hide();
        this.Menu_Controller.back_menu();
    }

    play(){
        let app;
        try{
            const t = i18n.get_translator();
            const l = i18n.get_label_getter();
            const C = this.Menu_Controller;
            let S = this.sources;
            let O = this.sources.system_options;
            this.add(t("ビットマップフォント構築中"),false);
            
            //ビットマップフォント
            PIXI.BitmapFont.from(
                'SansFont',
                {
                    fontFamily:"sans-serif",
                    fill: "#FFFFFF",
                    fontSize: 50,
                },
                {
                    chars: PIXI.BitmapFont.ASCII
                }
            );

            //pixi_app.ticker.targetFPMS = (O || 30)/1000;//SV 0.1.0対策
            this.add(t("ビットマップフォント構築完了"));
            
            C.change_visible(false);
            $("#player-window").show();
            

            let build_engine = async() => {
                $("#processing-cover").hide();
                //キャンバス
                let canvas = $('<canvas id="main-canvas"></canvas>')[0];
                $("#player-window").append(canvas);
                //アプリケーション
                let pixi_app = new PIXI.Application({
                    antialias:false,
                    view: canvas,
                });

                console.log("fps",O.max_fps);
                pixi_app.ticker.maxFPS = O.max_fps || 320;

                
                window.app = app = new Engine(pixi_app,i18n,{
                    skin_data: S.texture_data, 
                    skin_tex: S.texture_img,
                    engine_data: S.engine_data,
                    engine_config: S.engine_config,
                    effect_data: S.effect_data,
                    BGM: S.BGM,
                    level_data: S.level_data,
                    particle_data: S.particle_data, 
                    particle_tex: S.particle_img,
                    background_data: S.background_data,
                    background_config: S.background_config, 
                    background_tex: S.background_img,
                    level_option: S.level_option,
                    system_tex: S.system_tex,
                },{
                    key_assign: S.key_assign_data,
                    debug: true,//$("#debug_mode").prop("checked"),
                    bgm_volume: O.bgm_volume,
                    effect_volume: O.effect_volume,
                    vertices: O.mesh_vertexes,
                    curv_vertices: O.curv_vertexes,
                    audio_offset: O.audio_offset,
                    input_offset: O.input_offset,
                    render_scale: O.render_scale,
                    texture_scale: O.texture_scale,
                    anti_aliasing: 0,
                },{
                    leave_callback:() => {
                        app.game_end();
                        document.body.style.backgroundColor = "#000020";
                        TEMP.game_result = {
                            arcade_score: Math.round(app.arcade_score/app.maximum_combo *1000000),
                            accuracy_score: Math.round(app.accuracy_score/app.maximum_combo *1000000),
                            max_combo: app.max_combo,
                            possible_combo: app.maximum_combo,
                            acc_result: app.acc_result,
                            game_completed:false,
                            bucket_graphs:app.rendered_bucket_graph
                        };
                        C.change_visible(true);
                        $("#player-window").hide();
                        C.change_menu("ResultMenu");
                        window.app = app = null;
                        build_engine = null;
                    },
                    retry_callback:async() => {
                        app.game_end();
                        window.app = app = null;
                        $("#processing-cover").show();
                        setTimeout(async()=>{
                            await build_engine();
                        },100);
                    },
                    result_callback:() => {
                        app.game_end();
                        document.body.style.backgroundColor = "#000020";
                        TEMP.game_result = {
                            arcade_score: Math.round(app.arcade_score/app.maximum_combo *1000000),
                            accuracy_score: Math.round(app.accuracy_score/app.maximum_combo *1000000),
                            max_combo: app.max_combo,
                            possible_combo: app.maximum_combo,
                            acc_result: app.acc_result,
                            game_completed:true,
                            bucket_graphs:app.rendered_bucket_graph
                        };
                        C.change_visible(true);
                        $("#player-window").hide();
                        C.change_menu("ResultMenu");
                        window.app = app = null;
                        build_engine = null;
                    },
                    log_callback:(log_txt,successful) => {
                        this.add(t(log_txt),successful);
                    }
                });
                app.preparation();
            };
            build_engine();
        }catch(e){
            console.error(e);
            alert(`${t("異常停止")}(${e.name}: ${e.message}) ${t("再読み込み推奨")}`);
            if(app){
                if(app.fps_interval){
                    clearInterval(app.fps_interval);
                }
                if(app.looped_sound_id){//LoopedEffectをストップ
                    for(let [unique_id,loop_instace] of Object.entries(app.looped_sound_id)){
                        app.effect_object[loop_instace.effect_id].stop(loop_instace.sound_id);
                    }
                }
                if(app.BGM){//BGM停止
                    app.BGM.stop();
                }
                if(app.app){
                    app.app.destroy(true,{
                        children: true,
                        texture: true,
                        baseTexture: true,
                    });
                }
            }
            window.app = app = null;
            document.body.style.backgroundColor = "#000020";
            C.change_visible(true);
            $("#player-window").hide();
            C.back_menu();
        }
    }
}

class Offline_Menu extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return <div className="selector-window" id="item-selector">
            {t("参照")}：
            <select onChange={async()=>{
                $("#loading-cover").show();
                let value = $("#level-info #item-selector select").val();
                if(value == "default"){
                   //pass
                }else{
                    let items = await get_collection_items(value);
                    let ref_items = [];
                    for(let [name,item] of Object.entries(items)){
                        item.name = name;
                        ref_items.push({
                            default: false,
                            type: item.type,
                            item: item
                        });
                    }
                    this.setState({ref_items:ref_items});
                }
                $("#loading-cover").hide();
            }}>
                <option value="default">{t("コレクションを選択")}</option>
                {TEMP.collection_names.map(collection=><option key={collection}>{collection}</option>)}
            </select><br/>
            <div id="window">
                {this.state.ref_items.map(item=><Ref_Selector_on_LevelInfo C={C} onClick={()=>{
                    let source_obj = this.state.source_items;
                    source_obj[item.type.slice(0,-1)] = item;
                    this.setState({source_items:source_obj});
                }} type={item.type} item={item} key={`${item.item.name||"default"}(${item.type})`}/>)}
            </div>
        </div>;
    }
}

async function load_data(type,name_on_col,name_on_items){//name_on_itemsは配列で、最初の要素から順に存在を確認し、存在したら取得するようになっている。
    let data;
    let ITEM = TEMP.source_items[type];
    //console.log(`get ${name_on_col},${name_on_items} from:`, ITEM);
    if(ITEM.default){
        for(let name_on_item of name_on_items){
            if(name_on_item in ITEM.item){
                data = await get_content(ADDRESS,ITEM.item[name_on_item].url,ITEM.item[name_on_item].hash);
                data = JSON.parse(await gzip_uncomp(data));
                return data;
            }
        }
        throw new Error(`ERROR: The data of ${type} is not found in  item.`);
    }else{
        if(name_on_col in ITEM.item){
            data = ITEM.item[name_on_col];
            return data;
        }
        throw new Error(`ERROR: The data of ${type} is not found in collection.`);
    }
}

async function load_image(type,name_on_col,name_on_item){
    let image = new Image();
    let ITEM = TEMP.source_items[type];
    if(ITEM.default){
        image.src = URL.createObjectURL(await get_content(ADDRESS,ITEM.item[name_on_item].url,ITEM.item[name_on_item].hash));
    }else{
        let file = ITEM.item[name_on_col];
        // if(typeof file == "string"){
        //     file = Uint8ArrayToblob(base64ToUint8Array(file));
        // }
        image.src = URL.createObjectURL(file);
    }
    await wait_onload(image);
    URL.revokeObjectURL(image.src);//メモリリーク対策
    return image;
}

function wait_onload(obj,type="#onload"){
    return new Promise((resolve, reject) => {
        switch(type){
            case "#onload":
                obj.onload = resolve;
                break;
            case "#meta":
                obj.onloadedmetadata = resolve;
                break;
            default:
                obj.on(type,resolve);
                break;
        }
    });
}

async function gzip_uncomp(blob,output_text=true){
    let inst = new Gunzip(await blobToUint8Array(blob));
    let data = inst.decompress();
    if(output_text){
        return new TextDecoder().decode(data);
    }else{
        return Uint8ArrayToblob(data);
    }
    
}

async function zip_uncomp(blob){
    let unzip = new Unzip(await blobToUint8Array(blob));
    let result = {};
    for(let filename of unzip.getFilenames()){
        result[filename] = unzip.decompress(filename);
        result[filename] = Uint8ArrayToblob(result[filename]);
    }
    return result;
}

async function blobToUint8Array(blob){
    return new Uint8Array(await blob.arrayBuffer());
}

function Uint8ArrayToblob(array){
    return new Blob([array.buffer],{type:"application/octet-stream"});
}

async function get_content(domain,endpoint,hash){
    if(hash){
        let file = await db.cache.get(hash);
        if(file){
            return file.file;
        }else{
            let response = await fetch(RELAY_SERVER_URL,{
                method:"POST",
                body:JSON.stringify({
                    type:"content",
                    url:join_path(domain,endpoint)
                })
            });
            if(response){
                if(response.ok){
                    let blob = await blob_override(response);
                    db.cache.put({
                        hash: hash,
                        file: blob
                    });
                    return blob;
                }else{
                    throw new Error(`${response.status} : ${response.statusText}`);
                }
            }else{
                throw new Error("empty response");
            }
        }
    }else{
        let response = await fetch(RELAY_SERVER_URL,{
            method:"POST",
            body:JSON.stringify({
                type:"content",
                url:join_path(domain,endpoint)
            })
        });
        if(response){
            if(response.ok){
                return await blob_override(response);
            }else{
                throw new Error(`${response.status} : ${response.statusText}`);
            }
        }else{
            throw new Error("empty response");
        }
    }
}

class Result_Menu extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return <div id="result">
            <h3 className="Menu-title">{t("リザルト")}</h3>
            <div id="window" className="selector-window">
                <h3 id="title">{TEMP.level_info_data.item.title}</h3>
                <p id="arcade">{t("アーケードスコア")}:{TEMP.game_result.arcade_score}/1000000</p>
                <p id="accuracy">{t("精度スコア")}:{TEMP.game_result.accuracy_score}/1000000</p>
                <p id="max_combo">{t("最大コンボ")}:{TEMP.game_result.max_combo}/{TEMP.game_result.possible_combo}</p>
                <p id="acc_result">
                    PERFECT:{TEMP.game_result.acc_result.perfect}<br/>
                    GREAT:{TEMP.game_result.acc_result.great}<br/>
                    GOOD:{TEMP.game_result.acc_result.good}<br/>
                    MISS:{TEMP.game_result.acc_result.miss}
                </p>
            </div>
            <button id="back" className="btn" onClick={()=>{C.back_menu(2)}}>{t("戻る")}</button>
            <button id="back" className="btn" onClick={()=>{
                C.change_menu("BucketMenu");
            }}>{t("バケットグラフを見る")}</button>
      </div>;
    }
}

class Bucket_Menu extends React.Component{
    constructor(props){
        super(props);
        this.Menu_Controller = props.C;//Controller
    }
    render(){
        const C = this.Menu_Controller;
        const t = i18n.get_translator();
        return <div id="result">
            <h3 className="Menu-title">{t("バケットグラフ")}</h3>
            <div id="window" className="selector-window">
                {TEMP.game_result.bucket_graphs.map((graphs,i) => <Bucket_Graph graphs={graphs} key={i}/>)}
            </div>
            <button id="back" className="btn" onClick={()=>{C.back_menu()}}>{t("戻る")}</button>
        </div>;
    }
}

class Bucket_Graph extends React.Component{
    constructor(props){
        super(props);
        this.graphs = props.graphs;
        this.state = {
            graph:"all"
        };
        this.frame_ref = React.createRef();
    }
    render(){
        const t = i18n.get_translator();
        return <div>
            <div ref={this.frame_ref}></div>
            <select className="select-ref" onChange={(event)=>{
                this.setState({
                    graph: event.target.value
                })
            }}>
                <option value="all">{t("全部")}</option>
                <option value="perfect">PERFECT</option>
                <option value="great">GREAT</option>
                <option value="good">GOOD</option>
                <option value="miss">MISS</option>
            </select>
        </div>;
    }
    componentDidMount(){
        this.frame_ref.current.innerHTML = "";
        this.frame_ref.current.appendChild(this.graphs[this.state.graph]);
    }
    componentDidUpdate(){
        this.frame_ref.current.innerHTML = "";
        this.frame_ref.current.appendChild(this.graphs[this.state.graph]);
    }
}

/*##################
#######初期化#######
##################*/
//ローカリゼーションファイル
const URL_query = new URL(window.location.href).searchParams;
let LOCALIZATION = URL_query.has("lang")?URL_query.get("lang"):window.navigator.language;
console.log("user language:",LOCALIZATION);
const i18n = new I18n(LOCALIZATION,{
    "ja":"./localization/ja-localization-react.json",
    "en":"./localization/en-localization-react.json"
});
LOCALIZATION = i18n.language;
console.log("system language:",LOCALIZATION);
//ルート
const root_element = createRoot(document.getElementById("root"));
root_element.render(
//    <React.StrictMode>
        <Menu/>
//    </React.StrictMode>
);
//データベース
const db = new Dexie("contents_data");
db.version(3).stores({
    servers:"name,address,option,display_name,version",
    collections:"name,data,version",
    cache:"hash,file"
});
const VERSION = "0.5.5";

if (document.readyState === "complete") {
    $("#loading-cover").hide();
}else{
    window.addEventListener("load", function(){
        $("#loading-cover").hide();
    });
}

//サービスワーカー
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
}  

let TEMP = window.TEMP = {};//一時変数
let ADDRESS = "";
let SERVER_NAME = "";
const RELAY_SERVER_URL = "https://swp-server.ponz.workers.dev/";
let THUMB_TMP = {};
const COLLECTION_VERSION = 4;
const SERVER_VERSION = 2;