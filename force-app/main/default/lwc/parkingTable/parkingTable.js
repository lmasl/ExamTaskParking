import { LightningElement, wire, api, track } from 'lwc';
import getSensorsData from '@salesforce/apex/ParkingDataController.getSensorsData';
import deleteSensor from '@salesforce/apex/ParkingDataController.deleteSensor';


export default class ParkingTable extends LightningElement {

    get pageSizeOptions() {
        return [
            { label: 10, value: 10 },
            { label: 25, value: 25 },
            { label: 50, value: 50 },
            { label: 100, value: 100 },
            { label: 200, value: 200 },
        ];
    }
    
    @track page = 1;  
    @track data = []; 
    @track columns; 
    @track startingRecord = 1;
    @track endingRecord = 0; 
    @track pageSize = 10; 
    @track totalRecountCount = 0;
    @track totalPage = 0;
    @track searchKey = "";
    

   
    sensorsData;

    @track columns = [{
        label: 'Name',
        fieldName: 'Name__c',
        type: 'text',
        sortable: true
    },
    {
        label: 'Base Station',
        fieldName: 'BaseStationName',
        type: 'text',
        sortable: true
    },
    {
        label: 'Sensor model',
        fieldName: 'Sensor_model__c',
        type: 'text', 
        sortable: true
    },
    {
        label: 'Status',
        fieldName: 'Status__c',
        type: 'text',
        sortable: true
    },
    {   
        type: "button", 
        typeAttributes: {  
            label: 'Delete',  
            name: 'delete',  
            title: 'Delete',  
            disabled: false,  
            value: 'delete',
         }
        
    }

    ];

    getSensorsDataCallback({ error, data }) {
        if (data) {
            this.sensorsData = data.sensors.map(sensor => {
                let BaseStationName = (sensor.Base_Station__r || {}).Name;
                return Object.assign({}, sensor, {BaseStationName: BaseStationName});
            });

            this.pageSize = data.defaultPageSize;

            this.totalRecountCount = this.sensorsData.length; 
            this.totalPage = Math.ceil(this.totalRecountCount / this.pageSize); 
            
            this.data = this.sensorsData.slice(0, this.pageSize); 
            this.endingRecord = this.pageSize;
            this.page = 1;
        }
    }

    connectedCallback() {
        getSensorsData({searchKey: this.searchKey})
            .then(data => {
                this.getSensorsDataCallback({data});
            });
    }    

    startSearchTimer(event) {
        if (this.searchKey === event.target.value) {
            return;
        }

        this.searchKey = event.target.value;

        clearTimeout(this.timerId);

        this.timerId = setTimeout(() => {
            this.doSearch();
        },500);
    }
    doSearch() {
        getSensorsData({searchKey: this.searchKey})
            .then(data => {
                this.getSensorsDataCallback({data});
            });
    }

    handleRecordsPerPage(event){
        this.pageSize = Number(event.detail.value);
        this.totalPage = Math.ceil(this.totalRecountCount / this.pageSize);
        this.page = 1;
        this.displayRecordPerPage(this.page);

    }


    firstHandler() {
        if (this.page !== 1) {
            this.page = 1;
            this.displayRecordPerPage(this.page);
        }
    }

    lastHandler() {
        if(this.page !== this.totalPage) {
            this.page = this.totalPage;
            this.displayRecordPerPage(this.page);            
        }             
    }

    //clicking on previous button this method will be called
    previousHandler() {
        if (this.page > 1) {
            this.page = this.page - 1; //decrease page by 1
            this.displayRecordPerPage(this.page);
        }
    }

    //clicking on next button this method will be called
    nextHandler() {
        if((this.page<this.totalPage) && this.page !== this.totalPage){
            this.page = this.page + 1; //increase page by 1
            this.displayRecordPerPage(this.page);            
        }             
    }

    //this method displays records page by page
    displayRecordPerPage(page){
        this.startingRecord = ((page - 1) * this.pageSize) ;
        this.endingRecord = (this.pageSize * page);

        this.endingRecord = (this.endingRecord > this.totalRecountCount) 
                            ? this.totalRecountCount : this.endingRecord; 

        this.data = this.sensorsData.slice(this.startingRecord, this.endingRecord);

        this.startingRecord = this.startingRecord + 1;
    } 

    callRowAction( event ) {  
        const recId =  event.detail.row.Id;  
        const actionName = event.detail.action.name;  
        if ( actionName === 'Delete' ) {  
            deleteSensor({ sensorId: recId })
                .then((result) => {
                    this.totalRecountCount -= 1;
                    this.totalPage = Math.ceil(this.totalRecountCount / this.pageSize); 

                    this.page = this.page > this.totalPage ? this.totalPage : this.page;

                    let index = this.sensorsData.findIndex(sensor => sensor.Id === recId);

                    this.sensorsData.splice(index, 1);

                    this.displayRecordPerPage(this.page);
                });
        }        
    }  


    // this method validates the data and creates the csv file to download
    downloadCSVFile() {   
        if (!this.sensorsData.length) {
            return;
        }


        let rowEnd = '\n';
        let csvString = '';
        // this set elminates the duplicates if have any duplicate keys
        let rowData = new Set();

        // getting keys from data
        this.sensorsData.forEach(function (record) {
            Object.keys(record).forEach(function (key) {
                if (key === "Base_Station__r") {
                    return;
                }
                rowData.add(key);
            });
        });

        // Array.from() method returns an Array object from any object with a length property or an iterable object.
        rowData = Array.from(rowData);
        
        // splitting using ','
        csvString += rowData.join(',');
        csvString += rowEnd;

        // main for loop to get the data based on key value
        for(let i=0; i < this.sensorsData.length; i++){
            let colValue = 0;

            // validating keys in data
            for(let key in rowData) {
                if(rowData.hasOwnProperty(key)) {
                    // Key value 
                    // Ex: Id, Name
                    let rowKey = rowData[key];
                    // add , after every value except the first.
                    if(colValue > 0){
                        csvString += ',';
                    }
                    // If the column is undefined, it as blank in the CSV file.
                    let value = this.sensorsData[i][rowKey] === undefined ? '' : this.sensorsData[i][rowKey];
                    csvString += '"'+ value +'"';
                    colValue++;
                }
            }
            csvString += rowEnd;
        }

        // Creating anchor element to download
        let downloadElement = document.createElement('a');

        // This  encodeURI encodes special characters, except: , / ? : @ & = + $ # (Use encodeURIComponent() to encode these characters).
        downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvString);
        downloadElement.target = '_self';
        // CSV File Name
        downloadElement.download = 'Account Data.csv';
        // below statement is required if you are using firefox browser
        document.body.appendChild(downloadElement);
        // click() Javascript function to download CSV file
        downloadElement.click(); 
    }

}