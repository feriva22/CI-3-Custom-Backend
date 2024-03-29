function init_role(roles){
    $('.add_role').css('display',(roles.create) ? 'inline-block' : 'none');
    $('.update_role').css('display',(roles.update) ? 'inline-block' : 'none');
    $('.delete_role').css('display',(roles.delete) ? 'inline-block' : 'none');
    
}

function print_pdf(url, show_modal = true){
        printJS({
            printable:url, 
            type:'pdf', 
            showModal:show_modal, 
            modalMessage:'Mengambil Dokumen.....',
            onError: (error) => {
                console.log(error);
                if(error == 'Not Found'){
                    show_notification('error','File tidak ditemukan');
                }
            }
        });
}

function show_detail(type,url,data,expand = false, fillCustom,navtoggle = false){
    //insert
    if(type === 'add'){
        $('#detail_title h3').text('Tambah Data');
        resetForm('#form_detail');
        $('#form_detail').data('mode','add');
        $('.field-add').show();
        $('.field-edit').hide();
    //update
    }else{   

        if(data === 'undefined') {return false;}
        $('#form_detail').data('mode','edit');
        $('.field-edit').show();
        $('.field-show').hide();

        ajaxExtend({
            url: url.detail,
            data : data,
            success : function(resp){
                if(typeof(resp) !== 'undefined' && typeof(resp) === 'object'){
                    if(typeof(fillCustom) == 'undefined'){
                        fillForm('#form_detail',resp.data);
                    }else{
                        fillForm('#form_detail',resp.data,fillCustom);
                    }
                }
            }
        });
        $('#detail_title h3').text('Edit Data');
    }
    //show view
    if(!$('#detail_wrapper').is(':visible')){
        if(!expand){
            $('#table_wrapper').toggleClass("col-md-12 col-md-8").one('transitionend',()=>{
                $('#detail_wrapper').show("fast");
            });
        }else{
            //with full
            if(navtoggle){
                $('.nav-toggle').trigger('click');
            }
            $('#detail_wrapper').attr('class','col-md-12');
            $('#table_wrapper').hide();
            $('#detail_wrapper').show('fast');
        }   
    }
}

function hide_detail(expand = false){
    if($('#detail_wrapper').is(':visible')){
        $('#table_wrapper').show();
        if(!expand){  
            $('#detail_wrapper').hide("fast").one('transitionend',()=>{
                $('#table_wrapper').toggleClass("col-md-8 col-md-12");
                $('#table_wrapper').toggleClass("col-md-8 col-md-12");
            });
        }else{
            $('.nav-toggle').trigger('click');
            $('#detail_wrapper').attr('class','col-md-4');
            $('#detail_wrapper').hide("fast");
        }
    }
}

//get row dataid from datatable
function get_row_dataid(pk,e,isResArray){  
    var val = $(e.target).closest('.rowData').attr('data-id');
    return { [pk] : (isResArray) ? [val] :val};
}

function resetForm(selector){
    $(selector).trigger('reset');
    $('.switch-slider').val(1);
    $('.switch-slider').prop('checked',true).change();
    $(selector).find('input[type=hidden]').each(function(){    
        this.value = "";
    });
    
    $(selector).find("textarea[data-type='textarea']").each(function(){
        $(this).summernote('code','');
    })
    $(selector).find("textarea").each(function(){
        $(this).text('');
    })

    $(selector).find('.select2-hidden-accessible').each(function(){
        $(this).val(null).trigger('change');
    });
    
    $('.photo_preview').attr('src','');
    $('.selectpicker').selectpicker('deselectAll');
    $('.selectpicker').selectpicker('render');

    $('.default-hide').hide();
    $('div .row .data_value').remove(); //remove key value param

    //set all element with class .prevalue
    $('.prevalue').each(function(){
        $(this).text($(this).attr('data-default'));
    })
}

function fillForm(selector,data,customFill){
    resetForm(selector);
    $.each(data, function(key, value){
        var el = $('#'+key);
        if(el.attr('type') === 'checkbox'){
            $(el).prop('checked', (value == 1)).change();
        }
        else if(el.data('type') == 'also-fill-data-attr'){
            el.val(value);
            el.data('value',value);
        }
        else if(el.data('type') == 'custom'){
            customFill(el,value,key);
        }
        else if(el.hasClass('date')){
            $(`input[name=${key}]`).val(value);
        }
        else if(el.hasClass('select2-hidden-accessible')){
            if(el.hasClass('predefined-value')){
                el.val(value).trigger('change');
            }else{
                customFill(el,value);
            }
        }
        else if(el.is("div")){
            el.text(value);
        }
        else if(el.is("textarea")){
            el.text(value);
        }
        else if(el.is("input[type='file']")){
            $('.'+key).attr('src',base_url+value)
        } 
        else if(el.hasClass('selectpicker')){
            el.selectpicker('val',value);
            el.selectpicker('render');
        }
        else{
            el.val(value);
        }
    });
}

//get selected checkbox from datatable
function get_checked_row(selector){
    var data_selected = {[selector]: new Array()};
    $.each($(`input[name='${selector}[]']:checked`),function () {
         data_selected[selector].push(parseInt($(this).val()));
    });
    return data_selected;
}


function submitForm_handler(form_selector,url,dataTableobj,appendData,expand){
    $(form_selector).submit(function(e){
        e.preventDefault();
        var mode = $(form_selector).data('mode');
        var formData = new FormData(this);
        if(typeof(appendData) !== 'undefined'){
            appendData(formData);
        }
        
        formData.append(csrf_name,Cookies.get(csrf_name));//append csrf
        $.ajax({
            url: mode == 'add' ? url.add : url.edit,
            data: formData,
            type: 'post',
            mimeType: 'multipart/form-data',
            contentType: false,
            cache: false,
            processData: false,
            success: (resp)=>{
                if(isJson(resp)) {resp = JSON.parse(resp);}
                if(typeof(resp.status) !== 'undefined') {show_notification(resp.status,resp.message);}
                else {show_notification('error','Anda tidak memiliki akses');}
            },
            error: ()=>{
                show_notification('error','Error Connecting Server');
            }
        }).always(()=>{
            if(typeof(expand) !== 'undefined'){
                hide_detail(expand);
            }else{
                hide_detail();
            }
            dataTableobj.ajax.reload(null,false);
        })
    });
}

function deleteData_handler(url,data,dataTableobj){
    if(url.delete === 'undefined'){
        console.log('Error config');
        return false;
    }
    $.confirm({
        title: 'Konfirmasi',
        content: 'Yakin ingin hapus ?',
        buttons: {
            Ya: function(){
                ajaxExtend({
                    url: url.delete,
                    data : data,
                    success : (resp)=>{
                        if(isJson(resp)) {resp = JSON.parse(resp);}
                        if(typeof(resp.status) !== 'undefined') { $.alert(resp.message); }
                        else {$.alert('Anda tidak memiliki akses');}
                    },
                    error : (err)=>{$.alert('Error connecting to server');}
                },()=>{dataTableobj.ajax.reload(null,false)});
            },
            Tidak: function(){
                this.close();
            }
        }
    });
}

function formPhoto_handler(selector){
    $('#'+selector).on('change', function(e){
        var files = e.target.files; //FILESLIST object
        //loop throught the FileLIst and render image as thumbnails
        for (var i=0,f;f = files[i];i++){
           //only process image files
           if(!f.type.match('image.*'))  {
             return;
           }
           var reader = new FileReader();
           //closure to capture the file information
           reader.onload = (function(theFile){
             return function(e){
               //render thumbnail 
               $('.'+selector).attr('src',e.target.result);
   
             };
           })(f);
           reader.readAsDataURL(f);
        }
     })
}

function select2ajax(options){
    $(options.selector).select2({
        ajax: {
          url: options.url,
          dataType: 'json',
          delay: 500,
          type: 'post',
          data: function (params) {
            data_passed = {
                q: params.term, // search term
                page: params.page,
                [csrf_name] : Cookies.get(csrf_name)
            };
            Object.assign(data_passed, typeof(options.customquery) !== "undefined" ? options.customquery : {});
            return data_passed;
          },
          processResults: function (data, params) {
            params.page = params.page || 1;
            var select2Data = $.map(data.data, function (obj) {
                obj.id = obj[options.pk_id];
                obj.text = obj[options.key_value];
                return obj;
            });
            return {
              results: select2Data,
              pagination: {
                more: (params.page * 30) < data.total_count
              }
            };
          },
          cache: true
        },
        placeholder: options.placeholder,
        allowClear: true,
        minimumInputLength: options.minInput,
        templateResult: options.templateResultcallBack,
        templateSelection: options.templateSelectioncallBack,
        dropdownParent: typeof(options.onModalSelector) !== 'undefined' ? $(options.onModalSelector) : ''
    }); 

    $(options.selector).on('select2:select',options.selectedcallBack);
    $(options.selector).on('select2:clear',options.clearcallBack);

    if(typeof(options.initValue) !== 'undefined'){
        $(options.selector).append(new Option(options.initValue,options.initValue,true,true)).trigger('change').trigger('select2:select');
    }
}



function uploadImage(url,image,successCallback) {
    var data = new FormData();
    data.append("image", image);
    data.append(csrf_name,Cookies.get(csrf_name));//append csrf
    $.ajax({
        url: url,
        cache: false,
        contentType: false,
        processData: false,
        data: data,
        type: "POST",
        success: (resp) => {
            if(isJson(resp)) { resp = JSON.parse(resp);}
            if(typeof(resp.status) !== 'undefined'){
                if(resp.status == 'error'){ show_notification('error',resp.message)}
                else{
                    successCallback(resp);
                }
            }else{
                show_notification('error','Anda tidak memiliki akses');
            }
        },
        error:  (err) => { show_notification('error','Error koneksi dengan server');}
    });
}

function deleteImage(url,src){
    ajaxExtend({
        url: url,
        data: {src : src},
        success: (resp)=>{
            if(isJson(resp)) { resp = JSON.parse(resp);}
            if(typeof(resp.status) !== 'undefined'){
                show_notification(resp.status,resp.message);
            }else{
                show_notification('error','Anda tidak memiliki akses');
            }
        },
        error: (err) => { show_notification('error','Error koneksi dengan server');}
    });
}