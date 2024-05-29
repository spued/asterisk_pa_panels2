$(function() {
    $.post("/location_list_id",{ from: 'auto_radio' }, function(res){
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


    $.getJSON("/public/data/station_list.json").done(
        function( data ) {
            data = $.map(data, function(item) {
                return { id: item.ng_url, text: item.name }; 
            });
            $('#select_station').select2({
                data: data,
                height: '60px'
            });
        }
    );

    drawStationTable();
})
function drawStationTable() {
    $('#auto_station_list').html('');
    const _post_data = { 
        location_id : $('#page_location_id').val() 
    }
    $.post("/pa_auto_radio_list",_post_data, function(res) {
        const renderTableData = res.data.map((item) => {
            let _style = ''
            if(item.status == 'enable') _style = ' btn-success '; 
            else _style = ' btn-danger ';
            return `<tr data-uuid="${item.uuid}"> <td>${item.station_name}</td>
                    <td>${item.play_day} - ${item.play_start} </td>
                    <td>${item.play_length}</td>
                    <td>
                        <button class="btn btn-warning"><i class="fa-solid fas fa-edit btn-edit-station"></i></button>
                        <button class="btn btn-danger"><i class="fa-solid fas fa-times btn-delete-station"></i></button>
                        <button class="btn btn-info"><i class="fa-solid fas fa-play btn-play-station"></i></button>
                        <button class="btn ${_style} "><i class="fa-solid fas fa-pause btn-pause-station"></i></button>
                    </td>
                </tr>`;
            }).join('');
        $('#auto_station_list').html(renderTableData);
    }).then(function(){
    })
}


$(document).on('click','.btn-delete-station',function (evt) {
    let _uuid = $(this).closest("tr").attr('data-uuid');
    //console.log(uuid);
    if(confirm('Delete station data?')) {
        $.post("/pa_auto_radio_delete",{ uuid: _uuid }, function(res) {
            if(res.code == 0) {
                drawStationTable();
            }
            else {
                alert('Error : Can not delete data');
            }
        })
    }
})
$(document).on('click','.btn-edit-station',function (evt) {
    let _uuid = $(this).closest("tr").attr('data-uuid');
    let modal = $('#modal_edit_auto_radio');
    $.getJSON("/public/data/station_list.json").done( function( data ) {
            data = $.map(data, function(item) {
                return { id: item.ng_url, text: item.name }; 
            });
            $('#e_select_station').select2({
                data: data,
                height: '60px',
                width:'500px'
            });
      
            $.post("/pa_auto_radio_get",{ uuid : _uuid}, function(res) {
                if(res.code == 0) {
                    let _hour = res.data.play_start.split(":")[0];
                    let _minute = res.data.play_start.split(":")[1];
                    let _play_day = res.data.play_day.split(":");
                    modal.find("#e_uuid").val(_uuid);
                    modal.find("#e_location_name").text(res.data.location_name);
                    modal.find("#e_location_number").text(res.data.location_number);
                    modal.find("#e_select_start_time").val(_hour).trigger("change");
                    modal.find("#e_select_start_minute").val(_minute).trigger("change");
                    modal.find("#e_select_time_length").val(res.data.play_length).trigger("change");
                    modal.find("#e_select_station").val(res.data.station_url).trigger("change");
                    $(".e_weekday").prop( "checked", false );
                    for(let day of _play_day) {
                        $("#e_weekday-"+ day.toLowerCase()).prop( "checked", true );
                    }
                }
                else {
                    alert('Error : Can not edit data');
                }
            })
        }
    );
    modal.modal('show');
})

$(document).on('click','#btn_edit_auto_radio_save', (evt) => {
    let modal = $('#modal_edit_auto_radio');
    let _days = $(".e_weekday:checked").map(function() {
        return $(this).val();
      }).get().join(':');
    let _post_data = {
        uuid : $('#e_uuid').val(),
        station_name : $("#e_station_name").val(),
        station_url : $("#e_station_url").val(),
        play_day : _days,
        play_start : $('#e_select_start_time').val() + ':' +$('#e_select_start_minute').val(),
        play_length : $('#e_select_time_length').val()
    }

    $.post("/pa_auto_radio_edit", _post_data , function(res){
        //console.log(res);
        if(res.code == 0) {
            //console.log(res.data);
            modal.modal('hide');
            drawStationTable();
        } else {
            alert('Error: can not edit data.');
        }
    })
})

$(document).on('click','.btn-play-station',function (evt) {
    let _uuid = $(this).closest("tr").attr('data-uuid');
    $.post("/pa_auto_radio_play",{ uuid : _uuid, test: 'yes' }, function(res) {
        if(res.code == 0) {
            drawStationTable();
            $('#page_current_playing').val(_uuid);
        }
        else {
            alert('Error : Can not play');
        }
    })
})

$(document).on('click','.btn-pause-station',function (evt) {
    let _uuid = $(this).closest("tr").attr('data-uuid');
    $.post("/pa_auto_radio_pause",{ uuid : _uuid }, function(res) {
        if(res.code == 0) {
            drawStationTable();
            $('#page_current_playing').val('');
        }
        else {
            alert('Error : Can not stop');
        }
    })
})

$('#select_location').on('change', function(evt){
    $.post('/location_name', { name: $(this).val() }, function(_res) {
        $('#location_number').val(_res.number);
        $('#page_location_id').val(_res._id);
        $('#current_location_name').text(_res.name);
        $('#current_number').text(_res.number);

        $('#owner').val(_res.owner);
        $('#owner_id').val(_res.owner_id);

        sessionStorage.location_id = _res._id;
        sessionStorage.location_name = _res.name;

        drawStationTable();
    })
   
})
$('#select_station').on('change', function(evt){

})
$('#e_select_station').on('change', function(evt) {
    $("#e_station_url").val($(this).find(":selected").val());
    $("#e_station_name").val($(this).find(":selected").text());
})
$('#btn_add_auto_station').on('click', (evt) => {

    const location = $('#select_location').val();
    if(location == 'default') {
        return alert('Please select location');
    }
    const station = $('#select_station').val();
    if(station == '-1') {
        return alert('Please select station');
    }
    let _days = $(".weekday:checked").map(function() {
        return $(this).val();
      }).get().join(':');
    let _post_data = {
        location_name : $('#select_location option:selected').text(),
        location_id : $('#page_location_id').val(),
        location_number : $('#location_number').val(),
        owner : $('#owner').val(),
        owner_id : $('#owner_id').val(),
        sip_username : $('#page_user_bernum').val(),
        sip_password : $('#page_user_ssap').val(),
        station_name : $('#select_station option:selected').text(),
        station_url : $('#select_station').val(),
        play_day : _days,
        play_start : $('#select_start_time').val() + ':' +$('#select_start_minute').val(),
        play_length : $('#select_time_length').val()
    }

    $.post("/pa_auto_radio_add", _post_data , function(res){
        //console.log(res);
        if(res.code == 0) {
            drawStationTable();
            //console.log(res.data);
            return 0;
        } else if(res.code == 2){
            alert('Error: Over limit');
        } else {
            alert('Error: can not add data.');
        }
    })
    
});