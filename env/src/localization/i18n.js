export default class i18n{
    constructor(lng,resources,fallback_lng="ja"){
        if(lng in resources){
            this.language = lng;
        }else{
            this.language = fallback_lng;
        }
        this.file_url = resources[this.language];
    }
    load_file(){
        return new Promise((resolve,reject)=>{
            fetch(this.file_url).then(response => {
                if(response.ok){
                    response.text().then(text => {
                        this.resource = JSON.parse(text);
                        resolve();
                    });
                }else{
                    reject();
                }
            });
        });
    }
    translator(key){
        if(key in this.resource.translation){
            return this.resource.translation[key];
        }else{
            return "##i18n error##";
        }
    }
    get_label(key){
        if(this.is_label_included(key)){
            return this.resource.labels[key];
        }else{
            return key;
        }
    }
    is_label_included(key){
        return key in this.resource.labels
    }
    get_translator(){
        return this.translator.bind(this);
    }
    get_label_getter(){
        return this.get_label.bind(this);
    }
} 