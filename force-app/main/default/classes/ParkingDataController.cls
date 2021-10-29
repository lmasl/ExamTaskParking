public with sharing class ParkingDataController {
    @AuraEnabled(cacheable=true)
    public static SensorsData getSensorsData(String searchKey) {
        Integer defaultPageSize = 10;
        List<Default_Page_Size__mdt> paginationSettings = [SELECT Value__c FROM Default_Page_Size__mdt WHERE QualifiedApiName = 'Parking_Pagination'];
        if (!paginationSettings.isEmpty()) {
            defaultPageSize = Integer.valueOf(paginationSettings.get(0).Value__c);
        }
        String searchKeyWithPattern = '%' + String.escapeSingleQuotes(searchKey) + '%';
        return new SensorsData(
            [SELECT  Name__c, Base_Station__r.Name, Sensor_model__c, Status__c FROM Sensor__c WHERE Name__c LIKE: searchKeyWithPattern],
            defaultPageSize
        );
    }

    @AuraEnabled
    public static void deleteSensor(String sensorId) {
        delete new Sensor__c(Id = sensorId);
    }

    //Custom Metadata Types
    public class SensorsData {
        @AuraEnabled public List<Sensor__c> sensors {get;set;}
        @AuraEnabled public Integer defaultPageSize {get;set;}

        public SensorsData(List<Sensor__c> sensors, Integer defaultPageSize) {
            this.sensors = sensors;
            this.defaultPageSize = defaultPageSize;
        }
    }
}
