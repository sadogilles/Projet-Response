/**
 * NodeJS server for reponse project 
 * HMIN302 E-APPLICATION
 * By  GILLES SADO
 **/

const express = require('express');    //app build
const app = express();
//const { get } = require("request-promise");
const http = require('http');
const url = require('url');
const fs = require('fs');           //dependencies
const XRegExp = require('xregexp');
const rp = require('request-promise').defaults({encoding:'latin1'});
const $ = require('cheerio');
const { Console } = require('console');
const { inherits } = require('util');
const bodyParser = require('body-parser');
const { type } = require('os');
const { SSL_OP_NO_TLSv1_1 } = require('constants');
const { json } = require('body-parser');
const { resolve } = require('path');
const router = express.Router();

const PORT = process.env.PORT || 5555; //port configuration


const host ="http://www.jeuxdemots.org";
const path="/rezo-dump.php?gotermsubmit=Chercher&gotermrel="; //variables for rezo-dump


var file_base_path='./caches';
var words=[];
var definitions= '';

app.use(bodyParser.json()); //madatory before using route (permit to parse form-data)
app.use(bodyParser.urlencoded({extended:true}));

router.get('/',(req,res)=>{     // /api/rezon ->get request
   
    res.json({msg:'rezo: default route'});
});


router.post('/',async function(req,res){ //initialize all caches
    
    //console.log("word to analyse :"+ req.body.word);
    let path_cache ='./caches'+'/'+req.body.word.toLowerCase();
    let msg ='';
    //check if cache already exist //if don't do the processing
    if(fs.existsSync(path_cache)){//initially cache folder doesnot exist 
        msg='caches exist no processing needed';

        res.json({"msg":msg});

    }else{//do processing
        msg="word searched:"+req.body.word.toLowerCase();
        try{
            await initCaches(req.body.word.toLowerCase()).catch((err)=>{
                console.log('init:'+err);
            });

        }catch(err){
            msg="le mot : "+ req.body.word.toLocaleLowerCase()+"n'existe pas dans le rezo!";
            console.log("inside post :"+ err);
        }
       
        res.json({"msg":msg});

       
      
    }
    
    
   
});

router.get('/:word/definition',(req,res)=>{ //return first definition

    const word = req.params.word;

    let def = getFirstDefinition(word.toLocaleLowerCase());

    console.log("in definition");

    res.json({"definition":def});

});

router.get('/:word/definitions',function(req,res){ //returns array of definitions

    const word = req.params.word; 

    let defs = getDefinitions(word.toLocaleLowerCase());  //replace(/(\r\n|\n|\r)/gm, "");

    let new_defs = defs.map(def=>def.replace(/(\r\n|\n|\r)/gm, "")); //def without \n

    res.json({"definitions":new_defs});

    
});

router.get('/:word/refinements',(req,res)=>{ //returns all the refinements

    let path_cache ='./caches'+'/'+req.params.word.toLowerCase();
    
    let msg ='';
    const word = req.params.word;
    
    let refine = getRefinements(word.toLocaleLowerCase());

    console.log(path_cache);
 
    res.json({"refinements":refine});

    //check if cache already exist //if don't do the processing
    if(fs.existsSync(path_cache)){
        msg='caches exist no processing needed';

        res.json({"msg":msg,"refinement":refine });

    }else{//do processing

        res.json({"refinements":refine});
        
    }
    

    
    

});

router.get('/:word/refinement/:word_refine',(req,res)=>{ //get the definition of a refinement

    // let refinement = getDefinitionRefineWord(req.params.word,req.params.word_refine);

    getDefinitionRefineWord(req.params.word.toLocaleLowerCase(),req.params.word_refine.toLocaleLowerCase()).then((def)=>{

        if(def.isEmpty()){

            res.json({'definition':'No definition found for refinement'});
        }
        else{
            res.json({'definition':def});
        }

    });




    
});

router.get('/:word/relations',(req,res)=>{

    let relations = getRelations(req.params.word.toLowerCase());

    res.json({"r":relations});


});

router.get('/:word/relations_type',async (req,res)=>{ //returns all relations types
    
    //check if relation.csv doesnot exist //if no 
    let relation_path = './caches'+'/'+req.params.word.toLocaleLowerCase()+'/relations'+'.csv';
  

    console.log(relation_path);

    if(fs.existsSync(relation_path)){
        let relTypes = getRelationsType(req.params.word.toLocaleLowerCase());
    
        relTypes = Array.from(relTypes);
    
        res.json({"r":relTypes});

    }else{

         await getRelations(req.params.word.toLowerCase()); //initialize all relations.csv cache
        
        let relTypes = await getRelationsType(req.params.word.toLocaleLowerCase());
    
        relTypes = Array.from(relTypes);
        
    
        res.json({"r":relTypes});

    }

  

    


});

router.get('/:word/relation/:type/node',(req,res)=>{ //returns the outer or inner node

    let node = getNodeFromWordRelation(req.params.word.toLocaleLowerCase(),req.params.type);

    node = Array.from(node);

    res.json({"node":node});
 });

router.get('/:word/isa',(req,res)=>{     //r_isa relation             

    let $y = getIsaRelation(req.params.word.toLowerCase(),"r_isa");

    $y = Array.from($y);

    res.json({"nodes":$y});
})

// router.get('/:word/relations/:word1/is_a/:word2',(req,res)=>{ //not yet implemented
//   let r_isa_id= 6;
  
// });


//adding route to express
app.use('/api/rezo',router);
app.use(express.static('public')); //__dirname //for local directory

//port connection
 app.listen(PORT, ()=>console.log(`server started on PORT :${PORT}`));

 


  function getFirstDefinition(word)
  {

   let file_path = file_base_path+'/'+word+'/definition.txt';
   
    //load into file into cheero 
    try{

        var cheerio=  $.load(fs.readFileSync(file_path)); //old
        console.log(cheerio);
        //find first definition
        return cheerio('#1').text().trim(); 

    } catch(err){
        
        console.log(`an error occured while loading! : ${file_path}`);
        
        return "pas de definition!";
    }
   
      
}

function getRefinements(word)
{   
    let  refinement_path = file_base_path+'/'+word+'/refinement.txt';
    console.log(refinement_path);
   
    //check if file exist

    const refine = fs.readFileSync(refinement_path,"utf-8");  

    var refine_by_line = refine.split('\n');   
    
    
    return  refine_by_line;

 }      

function getDefinitionRefineWord(word,word_refine)
 {

    let  url_path = host+path+word_refine;
    let folder_path =file_base_path+'/'+word;
   
    let def_path=folder_path+'/'+'one_definition.txt';

    let  def =""
    //fetch data from rezo-dumpzzzz
    
    return new Promise((resolve,reject)=>{

        rp(url_path).then((data,error)=>{
        
            //parse the data
        def=$('def',data).text();
            

        resolve(def);
    
        if(error){
            
            reject(e);
        }
        

    })
     


    });

          


        



            
        
 }

 function getDefinitions (word)
 {
    file_path = file_base_path+'/'+word+'/definition.txt';

    var cheerio = $.load(fs.readFileSync(file_path));

    var allDef = cheerio('div').text();
    console.log(allDef);
    var definitions_by_line = allDef.split('\n\n\n');
    console.log(allDef);
    
    

    return definitions_by_line;

 }

function getRelations(word){


    file_path = file_base_path + '/' + word;
    //read the local file
    relation_path =file_path+'/'+'relations_raw'+'.csv';

    term_path = file_path+'/'+'terms_raw'+'.csv';
    
    links_path ='links'+'/relations'+'.csv';

    relation_new_path = file_path+'/'+'relations'+'.csv';

    rn1 =[];
    rn1Name=[];
    rn2 =[];
    rn2Name=[];
    rtype =[];
    rtyName=[];
    rweight=[];
    rweightName=[];
    allRel=[]; 

    //read relation file
    let relations = fs.readFileSync(relation_path,{encoding:"utf-8"},(err)=>{
        
        if(err) console.log(err);
    });
    //read term file
    let terms = fs.readFileSync(term_path,{encoding:"utf-8"},(err)=>{
        
        if(err) console.log(err);
    });
    //read link file
   let  links = fs.readFileSync(links_path,{encoding:"utf-8"},(err)=>{
        
        if(err) console.log(err);

    });

    //csv to array
    relations = csvToArray(relations);
    terms = csvToArray(terms);
    links = csvToArray(links);

    //get node1 node2  rtype
  
     for (let i = 0; i < relations.length; i++) { 
        // get the size of the inner array
        var innerArrayLength = relations[i].length;
        
        // loop the inner array
        for (let j = 0; j < innerArrayLength; j++) {
            // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);
           
            rn1.push(relations[i][2]);
            rn2.push(relations[i][3]);
            rtype.push(relations[i][4]);
            rweight.push(relations[i][5]);
            
            printIds(relations[i][2],relations[i][3],relations[i][4],relations[i][5]);//print all ids
            relToRofR(relations[i][2],relations[i][3],relations[i][4],relations[i][5]); //[] => [[]] 
            break; //go to next iteration  why a break? //break inner loop

            }
           
        }
       
      function printIds(rn1,rn2,rtype,rweight){
        console.log(rn1,rn2,rtype,rweight);
       }
    
     
      function relToRofR(rn1,rn2,rtype,rweight){ // convert to array of array // add rel row to array of array

            let rel1 = [rn1,rn2,rtype,rweight]
            allRel.push(rel1);
            

       }

       
       function replaceIdsByNames(relArray){ //[rn1,rn2,rtype,rweight]

        relArray.pop(); //remove last undefined row

        relArray.forEach(rel=>{

         //get node2 name 
        loop1:
        for (let i = 0; i < terms.length; i++) { 
            // get the size of the inner array
            var innerArrayLength = terms[i].length;
            
            loop2:
            // loop the inner array
            for (let j = 0; j < innerArrayLength; j++) {
                // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);       
               
                if(rel[0]===terms[i][1]){ //replacement node1
                    
                    //console.log(rel[1]+"==="+terms[i][1]) //good
                    //console.log(terms[i][2]);

                    //how to replace? add a new column?
                   // rel[4]=terms[i][2];
                   rel[0]=terms[i][2];
                   
                    break loop2;
                }

                if(rel[1]===terms[i][1]){ //replacement node2
                    
                    //console.log(rel[1]+"==="+terms[i][1]) //good
                    //console.log(terms[i][2]);

                    //how to replace? add a new column?
                   // rel[4]=terms[i][2];
                   rel[1]=terms[i][2];
                   
                    break loop2;
                }

                
            
            }
        }

        //get relation names
        for (let i = 0; i < links.length; i++) { 
            // get the size of the inner array
            var innerArrayLength = links[i].length;
            
            loop2:
            // loop the inner array
            for (let j = 0; j < innerArrayLength; j++) {
                // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);       
                
                if(rel[2]===links[i][0])  {
                    rel[2]=links[i][1];
                }  
            
            }
        }
           
        });

        return relArray;

       }

       let allRelReplaced = replaceIdsByNames(allRel); //allRel contains the array of array
      
       console.log(allRelReplaced);

       //convert array of relations to csv
       let data = arrayToCsv(allRelReplaced);

       //check if word cache folder exist

       //create relation cache and store it

       fs.writeFileSync(relation_new_path,data,{encoding:"utf-8"});

       return data;
 
}
function getRelationsType(word){

   let file_path = file_base_path + '/' + word;
   let relation_new_path = file_path+'/'+'relations'+'.csv';
   let folder_path =file_base_path+'/'+word;
   let rtypes = new Set();

   console.log(file_path);
   console.log(relation_new_path);

   if(fs.existsSync(folder_path)&& fs.existsSync(relation_new_path)){
    
    let data= fs.readFileSync(relation_new_path,{encoding:"utf-8"},(err)=>{
        
        if(err) console.log(err);
    });
 
   //csv to array
   data = csvToArray(data);
  
    //get the relation types
    for (let i = 0; i < data.length; i++) { 
        // get the size of the inner array
        var innerArrayLength = data[i].length;
        
        for (let j = 0; j < innerArrayLength; j++) {
            
            if((data[i][0].replace(/'/g, ""))===word){//remove unusual single quote on word word.replace(/'/g, "")
                rtypes.add(data[i][2]);              
            }
            
        }

    }

    console.log(rtypes);

   return rtypes;

    }
    else{

        return "cache folder and relations.csv doesnot exist";
    }

}

function getNodeFromWordRelation(word,rtype){

    let file_path = file_base_path + '/' + word;
    let relation_new_path = file_path+'/'+'relations'+'.csv';
    let folder_path =file_base_path+'/'+word;
    let nodeVal = new Set();

    if(fs.existsSync(folder_path)&& fs.existsSync(relation_new_path)){
    
        let data= fs.readFileSync(relation_new_path,{encoding:"utf-8"},(err)=>{
            
            if(err) console.log(err);
        });

        data = csvToArray(data);
  
        //get the nodes values
        for (let i = 0; i < data.length; i++) { 
            // get the size of the inner array
            var innerArrayLength = data[i].length;
            
            for (let j = 0; j < innerArrayLength; j++) {
                
                if((data[i][0].replace(/'/g, ""))===word && rtype===data[i][2] ){//remove unusual single quote on word word.replace(/'/g, "")
                   
                    nodeVal.add(data[i][1].replace(/'/g, ""));              
                
                }
                
            }
    
        }
    
        console.log(nodeVal);

        return nodeVal;



    }
     

}

function getIsaRelation(word,r_isa){
    let file_path = file_base_path + '/' + word;
    let relation_new_path = file_path+'/'+'relations'+'.csv';
    let folder_path =file_base_path+'/'+word;
    let nodeVal = new Set();

    console.log(r_isa);

    if(fs.existsSync(folder_path)&& fs.existsSync(relation_new_path)){
    
        let data= fs.readFileSync(relation_new_path,{encoding:"utf-8"},(err)=>{
            
            if(err) console.log(err);
        });

        data = csvToArray(data);
  
        //get the nodes values
        for (let i = 0; i < data.length; i++) { 
            // get the size of the inner array
            var innerArrayLength = data[i].length;
            
            for (let j = 0; j < innerArrayLength; j++) {
                
                if((data[i][0].replace(/'/g, ""))===word && data[i][2]===r_isa ){//remove unusual single quote on word word.replace(/'/g, "")
                   
                    nodeVal.add(data[i][1].replace(/'/g, ""));              
                
                }
                
            }
    
        }
    
        console.log(nodeVal);

        return nodeVal;
    }

}

function getRelationsIn(word){} 
function getRelationsOut(word){}
function isEmpty(str)
{
    return (!str || 0 === str.length);
}
function isBlank(str) 
{
    return (!str || /^\s*$/.test(str));
}
String.prototype.isEmpty = function()
{
    return (this.length === 0 || !this.trim());
}

function csvToArray (csv) {
    rows = csv.split("\n");

    return rows.map(function (row) {
        return row.split(";");
    });
}
function arrayToCsv(data){
    const rows = data;
    let csvContent = "data:text/csv;charset=utf-8,";

    rows.forEach(function(rowArray) {
        let row = rowArray.join(";");
        csvContent += row + "\r\n";
    });

    return csvContent;
}
async function initCaches(word)
{
       url_path = host+path+word;
       html_file = word+'.html';
       folder_path =file_base_path+'/'+word;
       file_path = folder_path+'/'+html_file;
       def_path=folder_path+'/'+'definition.txt';
       def = null;
       id_xreg = '(?is)[\(][e][i][d][=][0-9]+[)]';

       await rp(url_path).
                //request send
       then(function(html){ //create a folder and store the request result
           
           if(!fs.existsSync(folder_path)){

                fs.mkdir(folder_path,(err)=>{ //create folder for cache
                        
                    if (err){
                            console.log(`Error while creating the folder with name: ${word}`);
                    }else{
                        console.log(`Cache Folder with name : ${word} created successfully`);
                    }
                });

                fs.writeFileSync(file_path,html,{encoding:"utf-8"});

                console.log("HTML cache created with path: "+file_path);

           } else {
               console.log(`CACHE FOLDER ALREADY EXIST WITH PATH : ${folder_path}`);
           }
   
           return html;
       }).

       then(function(response){ //add the definitions
       
        
           def= $('def',response).text();//get the first definition
          
           if(!isEmpty(def)&&!isBlank(def)){ //if we have a definition
  
              def_with_html= '<div id="0">'+def+ '</div>' ;
  
              fs.appendFileSync(def_path, def_with_html ,(err)=>{
     
                 if(err) throw err;
                 console.log('first definition added to cache');
     
              });
  
           }else{ //create empty definition file
  
              fs.appendFileSync(def_path,'' ,(err)=>{
     
                  if(err) throw err;
                  console.log('empty definition file created');
      
               });
  
           }
           
  
  
           //parse html result to get word>relation

          var end_pattern = '[\>][A-Za-zÀ-ÖØ-öø-ÿ]+';   // var end_patern = '[b][a][n][a][n][e][\>][A-za-z]+'; //problem-> pattern doesnot handle non-ascii character
          var word_pattern='';
  
          for(var i=0;i<word.length;i++){      
              word_pattern +='['+word.charAt(i)+']';
          }
  
          pattern = word_pattern+end_pattern;

          pattern = '(?is)('+pattern+')';
          words_set = new Set();
  
          words = XRegExp.matchChain(response,[XRegExp(pattern)]); // a string
  


          for (var i=0;i<words.length;i++){ words_set.add(words[i]);} //word to set //duplication eliminated

          //loop through the set
          for(const w of words_set){console.log(w);}

          //store the refinement
          refinement_path = folder_path + '/'+'refinement.txt';
    
  
          for(var w of words_set){
  
               fs.appendFile(refinement_path,w+'\n',(err)=>{
                  if (err)  console.log(err);
               });
  
              url_path = host+path+w; 

               var counter =1;

               rp(url_path).then(function(html){
  
                      
                      def = $('def',html).text();
                   
                      
                     if(!isEmpty(def)&&!isBlank(def)){
  
                          def_with_html_tag= '<div id="'+counter+'">'+def+ '</div>' ;
      
                           fs.appendFile(def_path,def_with_html_tag,(err)=>{
      
                              if(err) throw err;
                                  
      
                              });

                              console.log("Adding defintion no: "+counter+" to cache");
      
                               return counter++;
                      }
                   
                      
              }
                  
              
              ).catch(function(error){

               console.log('Error occured :'+error);
           });   
   
  
          }
  
            return response;
  
          }).
          then((response)=>{ //create terms and relations csv , store also the id

            var body = response;
            id = XRegExp.matchChain(body.toString(), [XRegExp(id_xreg)]); //A-Za-zÀ-ÖØ-öø-ÿ
            //terme = XRegExp.matchChain(body.toString(), [XRegExp('(?is)(e[;])([0-9]+[;])([\'][A-Za-z]+([\>]|[\-])?[A-Z a-z 0-9]+[\'][;])([0-9]+[;])([0-9]+[;])?([\'][A-Za-z]+[\>]?[A-Z a-z 0-9]+[\'])?')]);
           // relation = XRegExp.matchChain(body.toString(), [XRegExp('(?is)r[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+')]);
            terme = XRegExp.matchChain(body.toString(), [XRegExp('(?is)(e[;])([0-9]+[;])([\'][A-Za-zÀ-ÖØ-öø-ÿ]+([\>]|[\-])?[A-Za-zÀ-ÖØ-öø-ÿ0-9]+[\'][;])([0-9]+[;])([0-9]+[;])?([\'][A-Za-zÀ-ÖØ-öø-ÿ]+[\>]?[A-Za-z À-Ö Ø-ö ø-ÿ 0-9]+[\'])?')]);
            relation = XRegExp.matchChain(body.toString(), [XRegExp('(?is)r[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+')]);
            file_path = file_base_path + '/' + word; //new file path

            if(typeof id !='undefined' && id.length>0){ //create id cache
                 
                 var def_path =file_path+'/'+'id_raw'+'.txt';

                 fs.writeFileSync(def_path,id,function(err) { if (err) throw err; });

            }else{

                //need to stop processing
            }
              //terme
              if(typeof terme !='undefined' && terme.length>0){
               
                //check if folder exist     
                if(fs.existsSync(file_path)){                 
                    
                    //create first cache with TERME
                    var term_path =file_path+'/'+'terms_raw'+'.csv';

                    fs.appendFile(term_path,'',function(err) { if (err) throw err; });
                   
                    //insert termes into file 
                    for (const t of terme) {
                        fs.appendFile(term_path, t + '\n','', function(err) { if (err) throw err; });
                    }
                    
                    console.log("cache : "+word+" with path : "+term_path+" created successfully");
        
                } else {
                    console.log(`CACHE FILE ALREADY EXIST WITH PATH : ${file_path}`);
                }
            }else{
                
                console.log('NO TERM FOUND DURING PARSING');
                
            }
            
          
            //Relation
            if (typeof relation != 'undefined' && relation.length > 0) {

                //check if folder exist
                if(fs.existsSync(file_path)){
                
                    //create  cache with RELATION
                    var relation_path =file_path+'/'+'relations_raw'+'.csv';
                    
                    //check if cache exist
                    if(fs.existsSync(file_path)){
                        console.log('number of relations :' + relation.length + '\n');

                        fs.appendFile(relation_path,'', function(err) { if (err) throw err; });
        
                        for (const r of relation) {
        
                            fs.appendFile(relation_path, r + '\n','', function(err) { if (err) throw err; });
                        }

                        console.log("cache : "+word+" with path : "+relation_path+" created successfully");
                    }else{
                        console.log(`CACHE FILE ALREADY EXIST WITH PATH : ${relation_path}`)
                    }
                    
                }else{
                    console.log(`FOLDER WITH FILE PATH:${file_path} DOESNOT exist`);
                }
               

            } else {
                console.log("NO RELATION FOUND DURING PARSING");
            }


            return response;

          }).
       catch(function(error){

           console.log('Error occured :'+error);
       });   

    }

function replaceRN1ByName(value){
   
    
}
function replaceIdByName(){

}


 async function initCaches(word)
{
       url_path = host+path+word;
       html_file = word+'.html';
       folder_path =file_base_path+'/'+word;
       file_path = folder_path+'/'+html_file;
       def_path=folder_path+'/'+'definition.txt';
       def = null;
       id_xreg = '(?is)[\(][e][i][d][=][0-9]+[)]';

    await rp(url_path).
                //request send
       then(async function(html){ //create a folder and store the request result
           
            //check if word exist in rezo-dump before continuing
            //jdm-warning


            //def= $('def',response).text();

            var elementNotFound = $('div.jdm-warning',html);
            
            if(elementNotFound.length>0){
                console.log("Le terme: "+word+" n'existe pas!");
                throw "Le terme :"+word+" n'existe pas!";
                
            }


           if(!fs.existsSync(folder_path)){

               function makeWordFolder(createHtmlCache){

                    fs.mkdir(folder_path,function(err){ //create folder for cache
                        
                        if (err){
                                console.log(`Error while creating the folder with name: ${word} err: ${err}`);
                        }else{
                            console.log(`Cache Folder with name : ${word} created successfully`);
                        }

                        createHtmlCache();
                    });
                }
                

                function createHtmlCache(){
                    fs.writeFileSync(file_path,html,{encoding:"utf-8"});
                    console.log("HTML cache created with path: "+file_path);
                }

                
                await makeWordFolder(createHtmlCache); //createHtmlCache is a callback

                

           } else {
               console.log(`CACHE FOLDER ALREADY EXIST WITH PATH : ${folder_path}`);
           }

           return html;
       }).

       then(function(response){ //add the definitions
       
        
           def= $('def',response).text();//get the first definition
          
           if(!isEmpty(def)&&!isBlank(def)){ //if we have a definition
  
              def_with_html= '<div id="0">'+def+ '</div>' ;
            

                  fs.appendFileSync(def_path, def_with_html ,(err)=>{
         
                     if(err){
                   
                         console.log('first definition added to cache');
                         throw err;
                        } 
                });

               

                                 
            }else{ //create empty definition file
  
              fs.appendFileSync(def_path,'' ,(err)=>{
     
                  if(err){
                
                      console.log('empty definition file created');
                      throw err;
                } 
                      
      
               });
  
           }
           
  
  
           //parse html result to get word>relation
  
          var end_pattern = '[\>][A-Za-zÀ-ÖØ-öø-ÿ]+';   // var end_patern = '[b][a][n][a][n][e][\>][A-za-z]+'; //problem-> pattern doesnot handle non-ascii character
          var word_pattern='';
  
          for(var i=0;i<word.length;i++){      
              word_pattern +='['+word.charAt(i)+']';
          }
  
          pattern = word_pattern+end_pattern;

          pattern = '(?is)('+pattern+')';
          words_set = new Set();
  
          words = XRegExp.matchChain(response,[XRegExp(pattern)]); // a string
  


          for (var i=0;i<words.length;i++){ words_set.add(words[i]);} //word to set //duplication eliminated

          //loop through the set
          for(const w of words_set){console.log(w);}

          //store the refinement
          refinement_path = folder_path + '/'+'refinement.txt';
    
  
          for(var w of words_set){
  
               fs.appendFile(refinement_path,w+'\n',(err)=>{
                  if (err)  console.log(err);
               });
  
              url_path = host+path+w; 

               var counter =1;

               rp(url_path).then(function(html){
  
                      
                      def = $('def',html).text();
                   
                      
                     if(!isEmpty(def)&&!isBlank(def)){
  
                          def_with_html_tag= '<div id="'+counter+'">'+def+ '</div>' ;
      
                           fs.appendFile(def_path,def_with_html_tag,(err)=>{
      
                              if(err) throw err;
                                  
      
                              });

                              console.log("Adding defintion no: "+counter+" to cache");
      
                               return counter++;
                      }
                   
                      
              }
                  
              
              ).catch(function(error){

               console.log('Error occured :'+error);

               return error;

               
           });   
   
  
          }
  
            return response;
  
          }).
          then(async (response)=>{ //create terms and relations csv , store also the id

            var body = response;
            id = XRegExp.matchChain(body.toString(), [XRegExp(id_xreg)]); //A-Za-zÀ-ÖØ-öø-ÿ
            //terme = XRegExp.matchChain(body.toString(), [XRegExp('(?is)(e[;])([0-9]+[;])([\'][A-Za-z]+([\>]|[\-])?[A-Z a-z 0-9]+[\'][;])([0-9]+[;])([0-9]+[;])?([\'][A-Za-z]+[\>]?[A-Z a-z 0-9]+[\'])?')]);
           // relation = XRegExp.matchChain(body.toString(), [XRegExp('(?is)r[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+')]);
            terme = XRegExp.matchChain(body.toString(), [XRegExp('(?is)(e[;])([0-9]+[;])([\'][A-Za-zÀ-ÖØ-öø-ÿ]+([\>]|[\-])?[A-Za-zÀ-ÖØ-öø-ÿ0-9]+[\'][;])([0-9]+[;])([0-9]+[;])?([\'][A-Za-zÀ-ÖØ-öø-ÿ]+[\>]?[A-Za-z À-Ö Ø-ö ø-ÿ 0-9]+[\'])?')]);
            relation = XRegExp.matchChain(body.toString(), [XRegExp('(?is)r[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+[;][0-9]+')]);
            file_path = file_base_path + '/' + word; //new file path

            if(typeof id !='undefined' && id.length>0){ //create id cache
                 
                 var def_path =file_path+'/'+'id_raw'+'.txt';

                await fs.writeFileSync(def_path,id,function(err) { if (err) throw err; });

            }else{

                //need to stop processing
                
            }
              //terme
              if(typeof terme !='undefined' && terme.length>0){
               
                //check if folder exist     
                if(fs.existsSync(file_path)){                 
                    
                    //create first cache with TERME
                    var term_path =file_path+'/'+'terms_raw'+'.csv';

                    fs.appendFile(term_path,'',function(err) { if (err) throw err; });
                   
                    //insert termes into file 
                    for (const t of terme) {
                        fs.appendFile(term_path, t + '\n','', function(err) { if (err) throw err; });
                    }
                    
                    console.log("cache : "+word+" with path : "+term_path+" created successfully");
        
                } else {
                    console.log(`CACHE FILE ALREADY EXIST WITH PATH : ${file_path}`);
                }
            }else{
                
                console.log('NO TERM FOUND DURING PARSING');
                
            }
            
          
            //Relation
            if (typeof relation != 'undefined' && relation.length > 0) {

                //check if folder exist
                if(fs.existsSync(file_path)){
                
                    //create  cache with RELATION
                    var relation_path =file_path+'/'+'relations_raw'+'.csv';
                    
                    //check if cache exist
                    if(fs.existsSync(file_path)){
                        console.log('number of relations :' + relation.length + '\n');

                        fs.appendFile(relation_path,'', function(err) { if (err) throw err; });
        
                        for (const r of relation) {
        
                            fs.appendFile(relation_path, r + '\n','', function(err) { if (err) throw err; });
                        }

                        console.log("cache : "+word+" with path : "+relation_path+" created successfully");
                    }else{
                        console.log(`CACHE FILE ALREADY EXIST WITH PATH : ${relation_path}`)
                    }
                    
                }else{
                    console.log(`FOLDER WITH FILE PATH:${file_path} DOESNOT exist`);
                }
               

            } else {
                console.log("NO RELATION FOUND DURING PARSING");
            }


            return response;

          }).then((response)=>{ // find the relation and store the relation using the id
            
            var def_path =file_path+'/'+'id_raw'+'.txt';
            id = fs.readFileSync(def_path,'utf-8');
            var term_path =file_path+'/'+'terms_raw'+'.csv';
            var relation_path = file_path+'/'+'relations_raw'+'.csv';
            var relation_in_path = file_path+'/'+'relations_in'+'.csv';
            var relation_out_path = file_path+'/'+'relations_out'+'.csv';

            term= fs.readFileSync(term_path,'utf-8');
            relation = fs.readFileSync(relation_path,'utf-8');
            
            id = String(id);
   
            id = id.replace(/\D/g,''); 

            console.log(typeof id); //id ok

            function csvToArray (csv) {
                rows = csv.split("\n");
            
                return rows.map(function (row) {
                    return row.split(";");
                });
            };

            relation = csvToArray(relation); //relation is an array of array
            term = csvToArray(term);

            relation_out_id = new Set();
            relation_in_id = new Set();
            relation_term = new Set();

            relation_out_term_name = new Set();
            relation_in_term_name = new Set();

            

            // loop the outer array
            for (let i = 0; i < relation.length; i++) { //relation in and out obtained
                // get the size of the inner array
                var innerArrayLength = relation[i].length;
                // loop the inner array
                for (let j = 0; j < innerArrayLength; j++) {
                    // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);

                    if(id===relation[i][2]){
                        relation_out_id.add(relation[i][3]);  
                    }
                    if(id===relation[i][3]){ 
                        relation_in_id.add(relation[i][2]);  
                    }
                }
            }

            if(relation_out_id.size!==0){ //

                let relation_out_id_array = Array.from(relation_out_id); //set to array;

                 //loop the outer array
                for (let i = 0; i < term.length; i++) { // find the name of incoming relation i.e terme[2]
                    // get the size of the inner array
                    var innerArrayLength = term[i].length;
                    // loop the inner array
                    for (let j = 0; j < innerArrayLength; j++) {
                        // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);

                        for(let k=0; k<relation_out_id_array.length;k++){

                            if(term[i][1]==relation_out_id_array[k]){

                                relation_out_term_name.add(term[i][2]);

                            }

                        }

                        
                    }

                
                 }

                 //store in relation_out.csv

                 for(let name of relation_out_term_name){
                    fs.appendFileSync(relation_out_path,name+'\n',(err)=> {if (err) console.log(err)})
                 }


            }
            
            console.log("size in: "+relation_in_id.size);
            console.log("size out: "+relation_out_id.size);

            if(relation_in_id.size!==0){

                let relation_in_id_array = Array.from(relation_out_id);

                    //loop the outer array
                for (let i = 0; i < term.length; i++) { // find the name of incoming relation i.e terme[2]
                    // get the size of the inner array
                    var innerArrayLength = term[i].length;
                    // loop the inner array
                    for (let j = 0; j < innerArrayLength; j++) {
                        // console.log('[' + i + ',' + j + '] = ' + relation[i][j]);

                        for(let k=0; k<relation_in_id_array.length;k++){

                            if(term[i][1]==relation_in_id_array[k]){

                                relation_in_term_name.add(term[i][2]);

                            }

                        }

                        
                    }
                
                for(let name of relation_in_term_name){
                    fs.appendFileSync(relation_in_path,name+'\n',(err)=> {if (err) console.log(err)})
                 }

                    
                }

            }





            return response;


          }).
       catch(function(error){

           console.log('Error occured :'+error);
       });   

}


function isEmpty(str)
{
    return (!str || 0 === str.length);
}
function isBlank(str) 
{
    return (!str || /^\s*$/.test(str));
}
String.prototype.isEmpty = function()
{
    return (this.length === 0 || !this.trim());
}
