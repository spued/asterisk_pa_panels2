    var main_audio = $('#main_audio')[0];
    var radio_player = $('#aux_audio')[0];
    var volume = [0.0, 0.2, 0.5, 0.8, 1.0];
    var volume_level = 3;

    function encodeHTML(s) {
        return s.replace(/\"/g, '&amp;').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function refresh_status() {
        let location_id = $('#page_location_id').val();
        //console.log('Refresh for location = ' + location_id);
        if(!location_id) return 0;
        let _post_data = {
            _id : location_id
        };   
        $.post('/device_list',_post_data, function(res){
            let html = '';
            //console.log(res);
            $('#extension_dot_list').html(html);
            if(res.data.length  > 0) {
                var offline_device = 0;
                var online_device = 0;
                var using_device = 0;
                html+= '<div class="row">';
                res.data.forEach(function(element, ind){
                    //console.log(element.volume);
                    //let _number = 0;
                    //let _name = '';
                    let _color = 'default';
                    let _vol = element.volume ? element.volume : '10';
                    let _vol_element = '<option value="'+_vol+'">'+_vol+'</option>'
                    if(element.device_state.length > 0) {
                        switch(element.device_state[0].state) {
                        case "0":
                            _color = 'red_dot';
                            offline_device++;
                            break; 
                        case "1":
                            _color = 'green_dot';
                            online_device++;
                            break; 
                        case "2":
                            _color = 'yellow_dot';
                            using_device++;
                            break; 
                        default: 
                            _color = 'dot';
                            break;
                        }
                    } else {
                        _color = 'dot';
                    }

                    html+= '<div class="col-md-2 bg-dark rounded m-2"><div class="row mt-2"><div class="col-md-2"><span title="หมายเลข ' 
                                + element.number + '" class="'
                                + _color +'"></span></div><div class="col-md-4">Volume</div><div class="col-md-6">'+
                                    '<select class="form-control select-set-volume" device_id="'
                                + element._id + '">'
                                + _vol_element+ '<option value="10">10</option><option value="8">8</option><option value="6">6</option><option value="4">4</option>'+
                                '<option value="2">2</option><option value="0">0</option></select></div><div class="col-md-6"></div><div class="col-md-12"><h5>' 
                                + element.name + '</h5></div></div></div>';
                }) 
                html+= '</div>';
                $('#extension_dot_list').html(html); 
            }
        })
    }
    $(function() {
        $.post("/location_list_id",{ from: 'dashboard' }, function(res){
            //console.log(res);
            $.each(res, function (i, item) {
                $('#select_location').append($('<option>', { 
                    value: item.name,
                    text : item.name
                    }));
            });
        }).then(function(){
            //console.log(sessionStorage.location_id + ',' + sessionStorage.location_name)
            if(sessionStorage.location_id != undefined) {
                $('#select_location').val(sessionStorage.location_name).trigger('change');
            }
        })

        refresh_status()
        radio_player.volume = 0.8;
        $('#volume_level').text('ระดับเสียง: ' + radio_player.volume * 10);

        $.getJSON("/public/data/station_list.json").done(
            function( data ) {
                data = $.map(data, function(item) {
                    return { id: item.ng_url, text: item.name }; 
                });
                $('#station_select').select2({
                    data: data
                });

                let table = document.getElementById('station_list');
                let pair_row = 0;
                for(station of data) {
                    if(station.text != undefined) {
                        let row = table.insertRow();
                        let cell = row.insertCell();
                        //cell.innerHTML= station.text;
                        let link = document.createElement("a");
                        link.setAttribute("href", "#")
                        link.className = "station_link";
                        link.setAttribute('data_value', station.id);
                        let linkText = document.createTextNode(station.text);
                        link.appendChild(linkText);
                        // Add the link to the previously created TableCell.
                        cell.appendChild(link);
                        pair_row++;
                    }
                }
            }
        );
    })    
    $(document).on('change','.select-set-volume', function(evt) {
        var thisSelect = $(this);
        //console.log(thisButton.attr('device_id'));
        var _post_data = {
            _id : thisSelect.attr('device_id'),
            _volume : thisSelect.val()
        }
        //console.log(_post_data);
        // Set volume data
        $.post("/device_volume",  _post_data, function(res){
            //console.log(res);
        })
    })
    $("#station_select").on('change', function (evt) {
        //console.log('val = ' + $(this).val());
        if($(this).val() != '-1') {
            radio_player.src = $(this).val();
        } else {
            radio_player.src = '';
        }
        //radio_player.src = 'https://astrapa.nt-acs.net:8210/station_1';
        //radio_player.preload = 'auto';
    });
    // show user note
    function show_user_note() {
        let _post_data = {
            _user_id : $('#page_user_id').val()
        }
        $.post("/get_user_note",  _post_data, function(res){
            //console.log(res.data);
            $('#user_note').val(res.data.note);
            $('#user_note').focus().prop({
                'selectionStart': res.data.selection_start, 
                'selectionEnd': res.data.selection_end
            })  
        });
    }
    show_user_note();

    $(document).on('click',".station_link", function (evt) {
        //radio_player.src = $(this).attr('data_value');
        $('#station_select').val($(this).attr('data_value')).trigger('change');
        radio_player.play();
    })

    $("#btn_save_message").on('click', function(evt) {
        var _post_data = {
            _user_id : $('#page_user_id').val(),
            _user_note : $('#user_note').val(),
            _user_select_start: $('#user_note').prop('selectionStart'),
            _user_select_end: $('#user_note').prop('selectionEnd')
        }
        // Set volume data
        $.post("/set_user_note",  _post_data, function(res){
            //console.log(res);
            alert('Message saved.')
        });
        show_user_note();
    })
    $("#btn_volume_up").on('click', function(evt) {
            volume_level++;
            if(volume_level >= 4) volume_level = 4;
            radio_player.volume = volume[volume_level];
            $('#volume_level').text('ระดับเสียง: ' + radio_player.volume * 10);
    })
    $("#btn_volume_down").on('click', function(evt) {
            volume_level--;
            if(volume_level <= 0) volume_level = 0;
            radio_player.volume = volume[volume_level];
            $('#volume_level').text('ระดับเสียง: ' + radio_player.volume * 10);
    })
    radio_player.addEventListener('play',function(evt){
        //console.log('play radio_player');
        var on_playing = document.getElementById('led_playing');
        on_playing.setAttribute('class','led-red');
    })
    radio_player.addEventListener('pause',function(evt){
        //console.log('play pause');
        var on_playing = document.getElementById('led_playing');
        on_playing.setAttribute('class','led-off');
    })
    
    $('#select_location').on('change', function(evt){
        $.post('/location_name', { name: $(this).val() }, function(_res) {
            //console.log(_res);
            $('#location_number').val(_res.number);
            $('#page_location_id').val(_res._id);
            $('#current_location_name').text(_res.name);
            $('#current_number').text(_res.number);
            $('#btn_main_off').trigger('click');

            sessionStorage.location_id = _res._id;
            sessionStorage.location_name = _res.name;

            refresh_status()
        })
    })
    setInterval(function() {
        refresh_status()
    }, 15000);
    $(document).on('beforeunload', function(){
        alert('Bye.');
    });