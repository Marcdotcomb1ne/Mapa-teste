const map = L.map('mapa').setView([-12.5, -41.7], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // isso aq vai guardar os dados de risco
        const dadosRisco = new Map();

        function getColor(risco) {
            if (risco === undefined || isNaN(risco)) return '#CCCCCC';
            if (risco > 0.8) return '#800026';
            if (risco > 0.6) return '#BD0026';
            if (risco > 0.4) return '#E31A1C';
            if (risco > 0.2) return '#FC4E2A';
            return '#FFEDA0';
        }
        // carrega os municipios.json e os formatos .csv
        Promise.all([
            fetch('AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2015_geojson.geojson').then(response => response.json()),
            fetch('AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2015_csv.CSV').then(response => response.text())
        ]).then(([geojsonFeature, csvData]) => {
            
            // ler o csv
            Papa.parse(csvData, {
                header: true, // cabeçalho
                skipEmptyLines: true,
                complete: function(results) {
                    console.log("Cabeçalhos e primeira linha do CSV:", results.data[0]);
                    // processar os dados da planilha csv e guardar no mapa
                    results.data.forEach(row => {
                        const codMun = row.geocod_ibge;
                        const riscoValor = parseFloat(row.valor); 
                        
                        if (codMun) {
                            dadosRisco.set(codMun, riscoValor);
                        }
                    });

                    //testes de depuracao
                    console.log("DADOS DE RISCO CARREGADOS (do CSV):", dadosRisco);

                    console.log("PROPIEDADES DO PRIMEIRO MUNICÍPIO (do GeoJSON):", geojsonFeature.features[0].properties);

                    // funcao pra desenhar o mapa
                    desenharMapaGeoJSON(geojsonFeature);
                }
            });
        });

        function desenharMapaGeoJSON(geojsonFeature) {

            function style(feature) {
                const risco = dadosRisco.get(feature.properties.geocod_ibge);
                return {
                    fillColor: getColor(risco),
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.75
                };
            }

            // mudar a cor ao passar o mouse
            function highlightFeature(e) {
                const layer = e.target;
                layer.setStyle({ weight: 3, color: '#666', dashArray: '' });
                info.update(layer.feature.properties);
            }

            function resetHighlight(e) {
                geojsonLayer.resetStyle(e.target);
                info.update();
            }

            function onEachFeature(feature, layer) {
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                });
            }

            const geojsonLayer = L.geoJson(geojsonFeature, { 
                style: style,
                onEachFeature: onEachFeature 
            }).addTo(map);

            // caixinha de informaçao
            info.addTo(map);
            // legenda
            legend.addTo(map);
        }

        // caixinha de informação que mostra o nome e o risco
        const info = L.control();
        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };
        info.update = function (props) {
            const risco = props ? dadosRisco.get(props.geocod_ibge) : undefined;
            const riscoFormatado = (risco !== undefined && !isNaN(risco)) ? risco.toFixed(2) : 'Sem dados';
            
            this._div.innerHTML = '<h4>Risco de Inundação no Brasil</h4>' +  (props ?
                '<b>' + props.name + '</b><br />Índice de Risco: ' + riscoFormatado
                : 'Passe o mouse sobre um município');
        };

        // legenda de cores
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 0.2, 0.4, 0.6, 0.8];
            
            div.innerHTML += '<b>Índice de Risco</b><br>';
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(grades[i] + 0.1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }
            div.innerHTML += '<br><i style="background:#CCCCCC"></i> Sem dados';
            return div;
        };