
$(function(){


   $('#search-form').on('submit',(event)=>{

    event.preventDefault();

    var searchInput = $('#search-input');
    var risa = $('span#risa');
    risa.empty();
    risa.append(searchInput.val());
    //reinitialize all fields
    var s_btn = $('#search-button');
    var def =$('#definition');
    def.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
    s_btn.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);

    $.ajax({
        url:'/api/rezo',
        method:'post',
        contentType: 'application/json',
        data:JSON.stringify({word:searchInput.val()}),
        success: (response)=>{
            console.log(response);
            //searchInput.val(searchInput.val());
            
            s_btn.show();
            def.fadeIn();
        }

    });


   });

   $('#definition').on('click',()=>{
        
        var word = $('#search-input');
        
        console.log(word.val());
        
        var definitionHere = $('#definition-here');
        var defs_button = $('#definitions');
        var ref_button =$('#refinement');
        var rel_button =$('#relation');
        //get all the button to freeze when definition is empty

        $.ajax({
            url:'/api/rezo/'+word.val()+'/definition',
            method:'get',
            contentType:'application/json',
            success: (response)=>{
                console.log(response);
               
                definitionHere.empty();
                //check if response (definition) is empty
                if(response.definition===''||response.definition===null || response.definition===undefined){
                    
                    definitionHere.text('Pas de definition par default !');
                    //freeze the other buttons

                    defs_button.addClass('w3-disabled');
                    defs_button.addClass('w3-red');
                    ref_button.addClass('w3-disabled');
                    ref_button.addClass('w3-red');
                    rel_button.addClass('w3-disabled');
                    rel_button.addClass('w3-red');



                }else{

            
                    defs_button.addClass('w3-green'); defs_button.removeClass('w3-red');
                    defs_button.removeClass('w3-disabled');
                    ref_button.addClass('w3-green'); ref_button.removeClass('w3-red');
                    ref_button.removeClass('w3-disabled');
                    rel_button.addClass('w3-green'); rel_button.removeClass('w3-red');
                    rel_button.removeClass('w3-disabled');
                    definitionHere.text(response.definition);

                }
         
            },
            error: (err)=>{
                console.log('an error occured while trying to process ')
                console.log(err);
            }
            
        });
   });

   $('#definitions').on('click',()=>{

    var word = $('#search-input');
    var defs = $('#definitions-here');

   
    $.ajax({
        url:'/api/rezo/'+word.val()+'/definitions',
        method:'get',
        contentType: 'application/json',
        success: (response)=>{

           
            console.log('/api/rezo/'+word.val()+'/definitions '+'\n'+response);

            defs.empty();

            for (var d in response.definitions) {
                defs.append('<div>'+response.definitions[d]+'</div> <hr>')
              }

        }

    });


   });

   $('#refinement').on('click',()=>{
   
    var ref = $('#refinement-here');
    var word = $('#search-input');

    $.ajax({
        url:'api/rezo/'+word.val()+'/refinements',
        method:'get',
        contentType:'application/json',
        success:(response)=>{
            console.log(response);
           
            
            if(response.refinements[0]===''||response.refinements[0]===null || response.refinements[0]===undefined){
                     
                ref.text('Pas de rafinemment disponible !');

            }else{

                ref.empty();

                for (var r in response.refinements){

                    var elm ='<button href="#" class="w3-bar-item w3-button w3-green refinement-button"  id="'+response.refinements[r] +'"> '+ response.refinements[r]+'</button>';

                    ref.append(elm);
                    
                    ref.append('<hr>')
                }
                
            }
        },
        error:(err)=>{
            console.log(err);
        }

    });

    });

    $('#refinement-here').on('click','button', (e)=>{
    
      var target = $(e.target);target.fadeOut(400);target.fadeIn(200);
      var ref_text = $(e.target).text(); console.log(ref_text);
      var word = $('#search-input');
      var ref_def =$('#ref-def');
      var url_='api/rezo/'+word.val()+'/refinement/'+ref_text;

       $.ajax({
           url:url_,
           method:'get',
           contentType:'application/json',
           success:(response)=>{
                console.log(response.definition);
                ref_def.text('');
           
            if (response.definition==="No definition found for refinement"){
                ref_def.text('Pas de definition disponible pour ce raffinement');
               
            }else{
                ref_def.text(response.definition);
            }
              
           },
           error:(err)=>{

               console.log(err);

           }

       })
      

    });

    //relation
    $('#relation').on('click',()=>{

        var relationHere= $('#relation-here');
        var word = $('#search-input');
        var url_ ='api/rezo/'+word.val()+'/relations_type';

        $.ajax({
            url:url_,
            method:'get',
            contentType:'application/json',
            success:(response)=>{

                console.log(response.r);
                
                for (var r in response.r){
                    
                    relationHere.append('<button href="#" class="w3-bar-item w3-button w3-green relation-button"  id="'+response.r[r] +'"> '+ response.r[r]+'</button>');
                   
                    relationHere.append('<hr>')
                }
            },
            error:(error)=>{
                console.log("ERROR WHILE FETCHING \n"+error);
            }

        });


    });

    $('#relation-here').on('click','button',(e)=>{ //e is the target
        //http://localhost:4000/api/rezo/sucre/relation/r_associated/node

        var target = $(e.target);target.fadeOut(400);target.fadeIn(200);
        var rel_text = $(e.target).text(); console.log(rel_text);
        var word = $('#search-input');
        var rel_nodes =$('#rel-nodes');

        var url_='api/rezo/'+word.val()+'/relation/'+rel_text.replace(/\s/g, '')+'/node';  //replace extra space with regexp
        console.log(url_);
        $.ajax({
            url:url_,
            method:'get',
            contentType:'application/json',
            success:(response)=>{

                console.log(response.node);
                rel_nodes.text('');

                for(var r in response.node){

                    rel_nodes.append(response.node[r]);
                    rel_nodes.append('&nbsp;,&nbsp;');
                }

            },
            error:(err)=>{
                console.log(err);
            }
        });
    });

    $('#risa-btn').on('click',()=>{

        var word = $('#search-input');
        var risa_node =$('#risa-node');
        var url_='api/rezo/'+word.val()+'/isa/';

        $.ajax({
            url:url_,
            method:'get',
            contentType:'application/json',
            success:(response)=>{

                console.log(response.nodes);
                risa_node.text('');
                for (var n in response.nodes){

                    if (!/[^a-zA-Z]/.test(response.nodes[n])){

                        risa_node.append(response.nodes[n]);
                        risa_node.append('&nbsp;,&nbsp;');
                    }
                }
            },
            error:(err)=>{
                console.log(err);
            }


        });

    });

    $('#rall-btn').on('click',()=>{
       
        //$('#r-datatable').show();

        var word = $('#search-input');
        var url_ ='api/rezo/'+word.val()+'/relations';
        
        $.ajax({
            url:url_,
            method:'get',
            success:(data)=>{
                
                var datas = [];

                for (var i in data.r){
                    datas.push(data.r[i]);
                }

                $('#r-datatable').DataTable( {
                    data: datas,
                    columns: [
                        { title: "Terme 1" },
                        { title: "Terme 2" },
                        { title: "Relation" },
                        { title: "Poid" }
                    ]
                } );
            },
            error:(err)=>{
                console.log('une erreur');
                console.log(err);
            }

        });
      
         
        
        
       
    });

    
   
});


